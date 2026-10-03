from __future__ import annotations

import re
from typing import Any


REDACT_TOKEN = "[REDACTED]"
MAX_PROMPT_SOURCE_CHARS = 1200

_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_PHONE_RE = re.compile(r"(?<!\d)(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]\d{3,4}(?!\d)")
_SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")

_INJECTION_PATTERNS = (
    re.compile(r"\bignore\s+(?:the\s+)?previous\s+instructions?\b", re.I),
    re.compile(r"\bignore\s+all\s+prior\s+instructions?\b", re.I),
    re.compile(r"\bdisregard\s+(?:the\s+)?(?:previous|prior)\s+instructions?\b", re.I),
    re.compile(r"\b(system|developer)\s+prompt\s*:", re.I),
    re.compile(r"\b(?:you are|act as)\s+(?:an?\s+)?(?:assistant|system|developer)\b", re.I),
    re.compile(r"\bdo not tell the user\b", re.I),
)


def redact_pii(text: str) -> tuple[str, dict[str, int]]:
    counts: dict[str, int] = {}
    for pattern, name in (
        (_EMAIL_RE, "emails"),
        (_PHONE_RE, "phones"),
        (_SSN_RE, "ssn"),
    ):
        matches = pattern.findall(text)
        if matches:
            counts[name] = len(matches)
            text = pattern.sub(REDACT_TOKEN, text)
    return text, counts


def neutralize_instructions(text: str) -> tuple[str, int]:
    removed = 0
    lines: list[str] = []
    for line in text.splitlines():
        if any(pattern.search(line) for pattern in _INJECTION_PATTERNS):
            removed += 1
            continue
        lines.append(line)
    return "\n".join(lines), removed


def sanitize_for_prompt(
    text: str,
    *,
    redact_pii_enabled: bool = True,
    level: str = "moderate",
) -> tuple[str, dict[str, Any]]:
    if not text:
        return text, {"pii_counts": {}, "injection_lines_removed": 0, "truncated": False}

    normalized_level = (level or "moderate").lower()
    if normalized_level == "off":
        return text[:MAX_PROMPT_SOURCE_CHARS], {"pii_counts": {}, "injection_lines_removed": 0, "truncated": len(text) > MAX_PROMPT_SOURCE_CHARS}

    sanitized = text
    pii_counts: dict[str, int] = {}
    if redact_pii_enabled and normalized_level in {"basic", "moderate", "strict"}:
        sanitized, pii_counts = redact_pii(sanitized)

    removed = 0
    if normalized_level in {"moderate", "strict"}:
        sanitized, removed = neutralize_instructions(sanitized)

    max_chars = 800 if normalized_level == "strict" else MAX_PROMPT_SOURCE_CHARS
    truncated = len(sanitized) > max_chars
    if truncated:
        sanitized = sanitized[:max_chars] + "...[truncated]"

    return sanitized, {
        "pii_counts": pii_counts,
        "injection_lines_removed": removed,
        "truncated": truncated,
    }
