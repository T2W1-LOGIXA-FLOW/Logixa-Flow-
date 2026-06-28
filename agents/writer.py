from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import requests

from config import (
    BACKEND_URL,
    DRAFTS_DIR,
    GEMINI_API_KEY,
    GEMINI_MODEL_NAME,
    GROQ_API_KEY,
    GROQ_MODEL_NAME,
    HUGGINGFACE_API_KEY,
    HUGGINGFACE_MODEL_NAME,
    LLM_PROVIDER,
    MODEL_NAME,
    OPENAI_API_KEY,
    OPENROUTER_API_KEY,
    OPENROUTER_FALLBACK_MODEL_NAME,
    OPENROUTER_MODEL_NAME,
    RAW_DIR,
    STRICT_LLM_ERRORS,
    TEMPERATURE,
)
from memory_analytics import MemoryAnalytics

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore


SYSTEM_PROMPT = """You are Logixa Flow's senior Supply Chain Management analyst.
Write in polished professional Myanmar business language for logistics, procurement,
manufacturing, retail, and SME leaders.

Strictly follow this template:
### [Catchy/Insightful Title in Myanmar]
Hook: [1-2 sentences capturing immediate attention]
Analysis (သုံးသပ်ချက်): [Deep industry context and implications]
Actionable Insight (လက်တွေ့အသုံးချနိုင်မှု): [Clear takeaways or strategic steps]

Rules:
- Use natural Myanmar business terminology.
- Keep the analysis practical, premium, and executive-ready.
- Do not invent facts beyond the source. If the source is limited, explain implications cautiously.
- Return only the finished article.
"""


@dataclass(frozen=True)
class DraftPost:
    source_id: str
    source_url: str
    title: str
    slug: str
    content_markdown: str
    created_at: str
    ai_model: str


def slugify(value: str) -> str:
    value = re.sub(r"[^\w\s-]", "", value.lower(), flags=re.UNICODE)
    value = re.sub(r"[-\s]+", "-", value).strip("-")
    return value[:80] or f"logixa-flow-{datetime.now(UTC).strftime('%H%M%S')}"


def parse_title(markdown: str, fallback: str) -> str:
    for line in markdown.splitlines():
        if line.startswith("### "):
            return line.replace("### ", "", 1).strip()
    return fallback.strip()


def fallback_myanmar_article(article: dict, style_hint: str = "") -> str:
    title = article.get("title", "Supply Chain Update")
    summary = article.get("summary", "")
    context = f"{title}. {summary}".strip()
    if len(context) > 420:
        context = context[:420].rsplit(" ", 1)[0] + "..."

    return f"""### Supply Chain လုပ်ငန်းများအတွက် သတိပြုသင့်သော အပြောင်းအလဲ
Hook: ကမ္ဘာ့ထောက်ပံ့ရေးကွင်းဆက်တွင် ဖြစ်ပေါ်နေသော သတင်းအသစ်များသည် စျေးနှုန်း၊ lead time နှင့် inventory strategy အပေါ် တိုက်ရိုက်သက်ရောက်နိုင်သည်။
Analysis (သုံးသပ်ချက်): ဒီသတင်း၏ အဓိကအချက်မှာ {context} ဖြစ်သည်။ လုပ်ငန်းများအတွက် ယင်းအခြေအနေသည် supplier risk, demand planning, logistics visibility နှင့် cost control ကို ပြန်လည်သုံးသပ်ရန် signal တစ်ခုဖြစ်သည်။ Logixa Flow အမြင်အရ data-driven monitoring၊ alternate sourcing နှင့် cross-functional decision cycle များကို တင်းကျပ်ထားနိုင်သည့်အဖွဲ့များက ပြောင်းလဲမှုကို ပိုမိုမြန်ဆန်စွာတုံ့ပြန်နိုင်မည်ဖြစ်သည်။
Actionable Insight (လက်တွေ့အသုံးချနိုင်မှု): Procurement နှင့် operations team များသည် supplier lead time, stock coverage, transport route risk နှင့် demand variance ကို အပတ်စဉ် dashboard တစ်ခုဖြင့်စောင့်ကြည့်ပါ။ Critical SKU များအတွက် backup supplier နှစ်ခုထက်မနည်း သတ်မှတ်ပြီး scenario plan ကို finance team နှင့်တကွ ပြန်လည်စစ်ဆေးသင့်သည်။{style_hint}"""


def source_text(article: dict) -> str:
    return json.dumps(
        {
            "title": article.get("title"),
            "summary": article.get("summary"),
            "link": article.get("link"),
            "published": article.get("published"),
        },
        ensure_ascii=False,
    )


def generate_with_gemini(article: dict, style_hint: str = "") -> tuple[str, str]:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL_NAME}:generateContent"
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            SYSTEM_PROMPT
                            + style_hint
                            + "\n\nRewrite this SCM source into the required Myanmar article template:\n"
                            + source_text(article)
                        )
                    }
                ],
            }
        ],
        "generationConfig": {"temperature": TEMPERATURE, "topP": 0.9, "maxOutputTokens": 1600},
    }
    response = requests.post(url, params={"key": GEMINI_API_KEY}, json=payload, timeout=45)
    response.raise_for_status()
    data = response.json()
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise RuntimeError("Gemini returned an empty response.")
    return text, f"gemini:{GEMINI_MODEL_NAME}"


def generate_openai_compatible(
    article: dict,
    api_key: str,
    base_url: str,
    model: str,
    provider_name: str,
    style_hint: str = "",
) -> tuple[str, str]:
    payload = {
        "model": model,
        "temperature": TEMPERATURE,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT + style_hint},
            {"role": "user", "content": source_text(article)},
        ],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Logixa Flow",
    }
    response = requests.post(f"{base_url.rstrip('/')}/chat/completions", headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    data = response.json()
    text = data["choices"][0]["message"]["content"].strip()
    if not text:
        raise RuntimeError(f"{provider_name} returned an empty response.")
    return text, f"{provider_name}:{model}"


def generate_with_openai(article: dict, style_hint: str = "") -> tuple[str, str]:
    if not OPENAI_API_KEY or OpenAI is None:
        raise RuntimeError("OPENAI_API_KEY is not configured.")
    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=MODEL_NAME,
        temperature=TEMPERATURE,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT + style_hint},
            {"role": "user", "content": source_text(article)},
        ],
    )
    return response.choices[0].message.content.strip(), f"openai:{MODEL_NAME}"


def provider_chain() -> list[str]:
    preferred = selected_provider()
    aliases = {
        "llama3": "openrouter_llama",
        "llama": "openrouter_llama",
        "deepseek": "openrouter_deepseek",
        "groq": "groq",
        "hf": "huggingface",
        "huggingface": "huggingface",
        "gemini": "gemini",
        "openai": "openai",
    }
    first = aliases.get(preferred, preferred)
    chain = [first, "gemini", "openrouter_llama", "openrouter_deepseek", "groq", "huggingface", "openai"]
    return list(dict.fromkeys(chain))


def selected_provider() -> str:
    try:
        response = requests.get(f"{BACKEND_URL}/api/settings/ai", timeout=5)
        if response.ok:
            return response.json().get("selected_model", LLM_PROVIDER).lower()
    except Exception:
        pass
    return LLM_PROVIDER.lower()


def safe_error_message(exc: Exception) -> str:
    message = str(exc)
    for secret in (GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, HUGGINGFACE_API_KEY, OPENAI_API_KEY):
        if secret:
            message = message.replace(secret, "***")
    return message


def generate_post_with_model(article: dict, memory: MemoryAnalytics | None = None) -> tuple[str, str]:
    style_hint = ""
    if memory:
        preferences = memory.get_style_preferences()
        if preferences:
            style_hint = "\nPreferred style signals: " + "; ".join(preferences[:5])

    errors: list[str] = []
    for provider in provider_chain():
        try:
            if provider == "gemini":
                return generate_with_gemini(article, style_hint=style_hint)
            if provider == "openrouter_llama" and OPENROUTER_API_KEY:
                return generate_openai_compatible(
                    article,
                    OPENROUTER_API_KEY,
                    "https://openrouter.ai/api/v1",
                    OPENROUTER_MODEL_NAME,
                    "openrouter",
                    style_hint,
                )
            if provider == "openrouter_deepseek" and OPENROUTER_API_KEY:
                return generate_openai_compatible(
                    article,
                    OPENROUTER_API_KEY,
                    "https://openrouter.ai/api/v1",
                    OPENROUTER_FALLBACK_MODEL_NAME,
                    "openrouter",
                    style_hint,
                )
            if provider == "groq" and GROQ_API_KEY:
                return generate_openai_compatible(
                    article,
                    GROQ_API_KEY,
                    "https://api.groq.com/openai/v1",
                    GROQ_MODEL_NAME,
                    "groq",
                    style_hint,
                )
            if provider == "huggingface" and HUGGINGFACE_API_KEY and HUGGINGFACE_MODEL_NAME:
                return generate_openai_compatible(
                    article,
                    HUGGINGFACE_API_KEY,
                    "https://router.huggingface.co/v1",
                    HUGGINGFACE_MODEL_NAME,
                    "huggingface",
                    style_hint,
                )
            if provider == "openai":
                return generate_with_openai(article, style_hint=style_hint)
        except Exception as exc:
            errors.append(f"{provider}: {safe_error_message(exc)}")
            if STRICT_LLM_ERRORS:
                raise

    print("All AI providers unavailable, using local fallback. " + " | ".join(errors))
    return fallback_myanmar_article(article, style_hint=""), "local:fallback"


def generate_post(article: dict, memory: MemoryAnalytics | None = None) -> str:
    text, _ = generate_post_with_model(article, memory=memory)
    return text


def process_raw_articles(raw_file: Path | None = None, limit: int | None = None) -> list[Path]:
    if raw_file is None:
        today = datetime.now(UTC).strftime("%Y-%m-%d")
        raw_file = RAW_DIR / f"{today}.jsonl"
    if not raw_file.exists():
        print(f"No raw articles found at {raw_file}")
        return []

    memory = MemoryAnalytics()
    draft_paths: list[Path] = []
    with raw_file.open("r", encoding="utf-8") as handle:
        for index, line in enumerate(handle):
            if limit is not None and index >= limit:
                break
            article = json.loads(line)
            markdown, ai_model = generate_post_with_model(article, memory=memory)
            title = parse_title(markdown, article.get("title", "logixa-flow-insight"))
            slug = slugify(f"{title}-{article.get('id', '')[:8]}")
            draft = DraftPost(
                source_id=article["id"],
                source_url=article["link"],
                title=title,
                slug=slug,
                content_markdown=markdown,
                created_at=datetime.now(UTC).isoformat(),
                ai_model=ai_model,
            )
            draft_path = DRAFTS_DIR / f"{datetime.now(UTC).strftime('%Y%m%d')}_{slug}.json"
            draft_path.write_text(
                json.dumps({**draft.__dict__, "category": "Supply Chain"}, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            memory.remember_vector(source_id=draft.source_id, title=draft.title, text=draft.content_markdown)
            draft_paths.append(draft_path)
            print(f"Draft saved: {draft_path} ({ai_model})")
    return draft_paths


if __name__ == "__main__":
    process_raw_articles()
