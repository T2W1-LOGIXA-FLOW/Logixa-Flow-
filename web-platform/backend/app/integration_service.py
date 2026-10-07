from __future__ import annotations

import ipaddress
import json
import os
import re
import socket
import urllib.request
import xml.etree.ElementTree as ET
from decimal import Decimal, InvalidOperation
from urllib.parse import urljoin, urlparse
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from . import models, schemas
from .analytics import log_analytics_event
from .models import utc_now

_APP_FILE = Path(__file__).resolve()
PROJECT_ROOT = Path(os.getenv("PROJECT_ROOT", "")).resolve() if os.getenv("PROJECT_ROOT") else (
    _APP_FILE.parents[3] if len(_APP_FILE.parents) > 3 else _APP_FILE.parents[1]
)
DEFAULT_DRAFTS_DIR = PROJECT_ROOT / "agents" / "data" / "drafts"

def _validate_rss_url(url: str) -> str:
    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("RSS feed URL must use http or https")
    if parsed.username or parsed.password:
        raise ValueError("RSS feed URL must not contain credentials")
    host = parsed.hostname.rstrip(".").lower()
    if host in {"localhost", "localhost.localdomain"}:
        raise ValueError("RSS feed host is not allowed")
    try:
        addresses = {ipaddress.ip_address(info[4][0]) for info in socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)}
    except (OSError, ValueError):
        raise ValueError("RSS feed host could not be resolved")
    if any(address.is_private or address.is_loopback or address.is_link_local or address.is_reserved or address.is_multicast or address.is_unspecified for address in addresses):
        raise ValueError("RSS feed host resolves to a private or reserved address")
    return parsed.geturl()


class _SafeRSSRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        _validate_rss_url(urljoin(req.full_url, newurl))
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_RSS_OPENER = urllib.request.build_opener(_SafeRSSRedirectHandler)

DEFAULT_RSS_FEEDS = [
    "https://news.google.com/rss/search?q=supply+chain+management&hl=en-US&gl=US&ceid=US:en",
    "https://news.google.com/rss/search?q=logistics+technology+supply+chain&hl=en-US&gl=US&ceid=US:en",
    "https://www.supplychaindive.com/feeds/news/",
]


def configured_rss_feeds(db: Session | None = None) -> list[str]:
    """Return configured RSS feeds.

    If a DB session is provided, prefer the persisted AppSetting 'integration_rss_feeds' (JSON list).
    Otherwise fall back to the INTEGRATION_RSS_FEEDS env var or built-in defaults.
    """
    if db is not None:
        try:
            setting = db.query(models.AppSetting).filter(models.AppSetting.key == "integration_rss_feeds").first()
            if setting and setting.value:
                import json

                try:
                    feeds = json.loads(setting.value)
                    return [item.strip() for item in feeds if item and item.strip()]
                except Exception:
                    # malformed setting, fall back to env/defaults
                    pass
        except Exception:
            pass
    raw = os.getenv("INTEGRATION_RSS_FEEDS", "").strip()
    if raw:
        return [item.strip() for item in raw.split(",") if item.strip()]
    return DEFAULT_RSS_FEEDS.copy()


def drafts_directory() -> Path:
    configured = os.getenv("AGENTS_DRAFTS_DIR", "").strip()
    if configured:
        return Path(configured)
    return DEFAULT_DRAFTS_DIR


def markdown_to_html(markdown: str) -> str:
    html_lines: list[str] = []
    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("### "):
            html_lines.append(f"<h2>{line[4:]}</h2>")
        elif line.startswith("## "):
            html_lines.append(f"<h2>{line[3:]}</h2>")
        elif line.startswith("Hook:"):
            html_lines.append(f"<p><strong>Hook:</strong> {line[5:].strip()}</p>")
        elif line.startswith("Analysis"):
            label, _, content = line.partition(":")
            html_lines.append(f"<h3>{label.strip()}</h3><p>{content.strip()}</p>")
        elif line.startswith("Actionable Insight"):
            label, _, content = line.partition(":")
            html_lines.append(f"<h3>{label.strip()}</h3><p>{content.strip()}</p>")
        else:
            html_lines.append(f"<p>{line}</p>")
    return "\n".join(html_lines) or "<p>Draft imported from agents pipeline.</p>"


def import_rss_feed(
    db: Session,
    feed_url: str,
    *,
    category: str = "Supply Chain",
    trust_level: str = "standard",
    limit: int = 5,
) -> tuple[int, int]:
    imported = 0
    skipped = 0
    try:
        safe_url = _validate_rss_url(feed_url)
        request = urllib.request.Request(
            safe_url,
            headers={"User-Agent": "Logixa-Flow-RSS/1.0"},
        )
        with _RSS_OPENER.open(request, timeout=12) as response:
            xml_data = response.read(2_000_000)
    except Exception:
        return 0, 0
    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError:
        return 0, 0
    items = root.findall(".//item")[:limit]
    for item in items:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        description = re.sub(r"<[^>]+>", "", item.findtext("description") or "").strip()
        if not title:
            skipped += 1
            continue
        exists = db.query(models.IntelligenceSource).filter(models.IntelligenceSource.url == link).first() if link else None
        if exists:
            skipped += 1
            continue
        db.add(
            models.IntelligenceSource(
                title=title[:255],
                url=link or None,
                source_type="rss",
                category=category,
                trust_level=trust_level,
                notes=description[:8000],
            )
        )
        imported += 1
    if imported:
        db.commit()
        log_analytics_event(db, "rss_import", {"feed_url": feed_url, "imported": imported, "integration": True})
    return imported, skipped


def sync_default_feeds(
    db: Session,
    *,
    category: str = "Supply Chain",
    trust_level: str = "standard",
    limit_per_feed: int = 5,
) -> dict[str, Any]:
    total_imported = 0
    total_skipped = 0
    feed_results: list[dict[str, Any]] = []
    for feed_url in configured_rss_feeds(db):
        imported, skipped = import_rss_feed(
            db,
            feed_url,
            category=category,
            trust_level=trust_level,
            limit=limit_per_feed,
        )
        total_imported += imported
        total_skipped += skipped
        feed_results.append({"feed_url": feed_url, "imported": imported, "skipped": skipped})
    rag_summary: dict[str, int] = {}
    if total_imported and os.getenv("RAG_AUTO_INGEST", "true").lower() == "true":
        from .rag.ingest import ingest_all_sources

        rag_summary = ingest_all_sources(db, limit=200)
    return {
        "feeds_processed": len(feed_results),
        "imported": total_imported,
        "skipped": total_skipped,
        "feeds": feed_results,
        "rag": rag_summary,
    }


def import_draft_dict(db: Session, draft: dict[str, Any]) -> models.AiMemoryBrain | None:
    title = (draft.get("title") or "CLI Draft Insight").strip()
    markdown = draft.get("content_markdown") or draft.get("content") or ""
    if not markdown.strip():
        return None
    source_url = draft.get("source_url")
    existing = (
        db.query(models.AiMemoryBrain)
        .filter(models.AiMemoryBrain.source_url == source_url, models.AiMemoryBrain.status == "pending")
        .first()
        if source_url
        else None
    )
    if existing:
        return existing
    memory = models.AiMemoryBrain(
        category=draft.get("category", "Supply Chain"),
        source_title=title[:255],
        source_url=source_url,
        prompt=f"Imported from agents pipeline ({draft.get('ai_model', 'cli')})",
        content=markdown_to_html(markdown),
        summary=re.sub(r"\s+", " ", markdown)[:500],
        status="pending",
        is_public=False,
        confidence_score=0.55,
        hallucination_score=0.25,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    log_analytics_event(db, "cli_draft_imported", {"memory_id": memory.id, "slug": draft.get("slug")})
    return memory


def import_drafts_from_folder(db: Session, *, limit: int = 10) -> dict[str, Any]:
    drafts_dir = drafts_directory()
    if not drafts_dir.exists():
        return {"imported": 0, "skipped": 0, "drafts_dir": str(drafts_dir), "error": "drafts directory not found"}
    paths = sorted(drafts_dir.glob("*.json"), key=lambda item: item.stat().st_mtime, reverse=True)
    imported = 0
    skipped = 0
    memory_ids: list[int] = []
    for path in paths[:limit]:
        try:
            draft = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            skipped += 1
            continue
        memory = import_draft_dict(db, draft)
        if memory:
            imported += 1
            memory_ids.append(memory.id)
        else:
            skipped += 1
    return {
        "imported": imported,
        "skipped": skipped,
        "memory_ids": memory_ids,
        "drafts_dir": str(drafts_dir),
    }


async def run_preview_agent(
    db: Session,
    *,
    message: str | None = None,
    max_sources: int = 8,
) -> dict[str, Any]:
    from .agent_graph import execute_content_graph
    from .routers.agent import score_source_grounding, serialize_run

    sources = db.query(models.IntelligenceSource).order_by(models.IntelligenceSource.updated_at.desc()).limit(max_sources).all()
    objective = message or os.getenv(
        "INTEGRATION_AGENT_PROMPT",
        "Generate a Myanmar-ready supply chain preview brief for admin review only.",
    )
    run = models.AgentRun(
        objective=objective,
        model="pending",
        status="running",
        input_context=json.dumps({"message": objective, "source_ids": [source.id for source in sources]}),
        source_ids=json.dumps([source.id for source in sources]),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        graph = execute_content_graph(db, run, objective, sources)
    except Exception:
        run.status = "failed"
        db.commit()
        raise

    confidence_score, hallucination_score = score_source_grounding(sources)
    fact_check = graph.final.get("fact_check") or {}
    quality_gate = graph.final.get("quality_gate") or {}
    if fact_check.get("verdict") == "fail" or quality_gate.get("verdict") == "fail":
        confidence_score = min(confidence_score, 0.45)
        hallucination_score = max(hallucination_score, 0.55)

    content = str(graph.final.get("content_html") or graph.final.get("content") or "").strip()
    title = str(graph.final.get("title") or "AI Preview: Supply Chain Signal Brief")
    excerpt = str(graph.final.get("excerpt") or "Private AI-generated draft for admin review.")
    provider = ",".join(dict.fromkeys(graph.providers)) or "local"
    run.model = str(graph.final.get("model") or "local")
    run.provider = provider
    run.token_usage = graph.total_tokens
    run.cost_estimate = (graph.total_tokens / 1000) * float(os.getenv("AI_COST_PER_1K", "0.002"))
    run.status = "completed"

    memory = models.AiMemoryBrain(
        category=sources[0].category if sources else "Supply Chain",
        source_title=title,
        source_url=sources[0].url if sources else None,
        prompt=objective,
        content=content or "<p>Agent graph completed without a publishable draft.</p>",
        summary=excerpt[:500],
        status="pending",
        is_public=False,
        confidence_score=confidence_score,
        hallucination_score=hallucination_score,
        source_ids=json.dumps([source.id for source in sources]),
        provider=provider,
        token_usage=graph.total_tokens,
        cost_estimate=run.cost_estimate,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    run.final_memory_id = memory.id
    db.commit()
    db.refresh(run)

    log_analytics_event(
        db,
        "integration_agent_run",
        {"run_id": run.id, "memory_id": memory.id, "source_count": len(sources), "providers": provider},
    )
    serialized = serialize_run(db, run)
    return {
        "run_id": run.id,
        "memory_id": memory.id,
        "source_count": len(sources),
        "run": serialized.model_dump(),
    }
