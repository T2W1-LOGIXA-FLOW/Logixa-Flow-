from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Callable

from sqlalchemy.orm import Session

from . import models
from .llm.router import LLMRouter, sanitize_provider_error
from .rag.search import build_rag_context
from .rag.sanitizer import sanitize_for_llm

@dataclass(frozen=True)
class AgentGraphResult:
    final: dict[str, Any]
    total_tokens: int
    providers: list[str]

NODE_TASKS = (
    ('researcher', 'research'),
    ('analyst', 'analysis'),
    ('writer', 'writing'),
    ('seo', 'seo'),
    ('fact_checker', 'factcheck'),
    ('quality_gate', 'analysis'),
)

def _parse_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith('```'):
        cleaned = re.sub(r'^```(?:json)?', '', cleaned).removesuffix('```').strip()
    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError:
        return {'text': cleaned[:8000]}
    return value if isinstance(value, dict) else {'text': cleaned[:8000]}

def _tokens(text: str) -> int:
    return max(1, len(text) // 4)

def _prompt_for(task: str, objective: str, evidence: str, state: dict[str, Any]) -> str:
    prior = json.dumps(state, ensure_ascii=False)[:14000]
    if task == 'research':
        return ('You are the research agent in Logixa Flow. Use only supplied source/RAG evidence. '
                'Extract verifiable claims, source references, dates, entities, and uncertainties. '
                'Return JSON: claims[], evidence[], gaps[]. Never invent facts.\n'
                f'OBJECTIVE: {objective}\nEVIDENCE:\n{evidence[:18000]}')
    if task == 'analysis':
        return ('You are the analysis agent in Logixa Flow. Analyze prior evidence without adding unsupported facts. '
                'Return JSON: key_signals[], business_impacts[], risks[], implications[].\n'
                f'OBJECTIVE: {objective}\nSTATE:\n{prior}')
    if task == 'writing':
        return ('You are the writing agent in Logixa Flow. Draft a private editorial article grounded only in the '
                'research and analysis. Return JSON with title, excerpt, content_html. Never invent facts.\n'
                f'OBJECTIVE: {objective}\nSTATE:\n{prior}')
    if task == 'seo':
        return ('You are the SEO agent in Logixa Flow. Produce metadata for the supplied draft. Return JSON with '
                'seo_title, meta_description, slug, canonical_hint, keywords[], internal_link_topics[]. '
                'Do not alter factual claims.\nSTATE:\n' + prior)
    if task == 'factcheck':
        return ('You are the fact-checking agent in Logixa Flow. Compare material claims against the research evidence. '
                'Return JSON with verdict (pass|review|fail), checked_claims[], unsupported_claims[], corrections[]. '
                'A missing source means review, not approval.\nEVIDENCE:\n' + evidence[:14000] + '\nSTATE:\n' + prior)
    return ('You are the quality gate agent in Logixa Flow. Decide whether content is ready for human review. '
            'Return JSON with verdict (pass|review|fail), reasons[], required_edits[]. Publishing must never be automatic.\n'
            'STATE:\n' + prior)

def execute_content_graph(db: Session, run: models.AgentRun, objective: str, sources: list[models.IntelligenceSource], *,
                          on_step: Callable[[models.AgentStep], None] | None = None) -> AgentGraphResult:
    safe_objective = sanitize_for_llm(objective)
    evidence = build_rag_context(db, safe_objective, [source.id for source in sources])
    if not evidence or 'No retrieved' in evidence:
        evidence = '\n'.join(
            f'- {source.title}: {source.notes[:1600]} ({source.url or "no URL"})' for source in sources
        ) or 'No source evidence was supplied.'
    state: dict[str, Any] = {'objective': safe_objective, 'source_ids': [s.id for s in sources]}
    providers: list[str] = []
    total_tokens = 0
    for order, (agent_name, task) in enumerate(NODE_TASKS, start=1):
        step = models.AgentStep(run_id=run.id, step_order=order, agent=agent_name, message=f'{agent_name} started',
                                status='running', output_json='{}')
        db.add(step)
        db.commit()
        db.refresh(step)
        try:
            raw, model_used = LLMRouter(db).generate_with_provider(
                _prompt_for(task, safe_objective, evidence, state), task=task
            )
            parsed = _parse_json(raw)
            provider = model_used.split('/', 1)[0] if '/' in model_used else model_used
            used_tokens = _tokens(raw)
            step.status = 'completed'
            step.provider = provider
            step.model = model_used
            step.token_usage = used_tokens
            step.output_json = json.dumps(parsed, ensure_ascii=False)
            step.message = f'{agent_name} completed'
            db.commit()
            db.refresh(step)
            state[agent_name] = parsed
            total_tokens += used_tokens
            providers.append(provider)
            if on_step:
                on_step(step)
        except Exception as exc:
            step.status = 'failed'
            step.error = sanitize_provider_error(str(exc))[:1000]
            step.message = f'{agent_name} failed'
            db.commit()
            raise
    final = dict(state.get('writer') or {})
    final['seo'] = state.get('seo') or {}
    final['fact_check'] = state.get('fact_checker') or {}
    final['quality_gate'] = state.get('quality_gate') or {}
    final['model'] = providers[-1] if providers else 'local'
    return AgentGraphResult(final=final, total_tokens=total_tokens, providers=providers)