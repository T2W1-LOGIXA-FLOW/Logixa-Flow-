from __future__ import annotations

import re
from dataclasses import dataclass

from ..config import clean_env_value


_EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
_SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
_PHONE_RE = re.compile(
    r"(?<!\d)(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3,4}[\s.-]\d{3,4}(?!\d)"
)
_CARD_RE = re.compile(r"(?<!\d)(?:\d[ -]?){13,19}(?!\d)")
_PROMPT_INJECTION_RE = re.compile(
    r"(?is)\b(?:ignore|disregard|override|forget)\s+(?:all\s+|any\s+|the\s+)?"
    r"(?:previous|prior|above|earlier)\s+(?:instructions?|rules?|messages?|prompts?)\b"
    r"|\b(?:system|developer)\s*(?:prompt|message)\s*:\s*"
    r"|\b(?:jailbreak|do anything now|dan mode)\b"
)


@dataclass(frozen=True)
class SanitizationResult:
    text: str
    pii_redactions: int
    prompt_injection_redactions: int


def pii_redaction_enabled() -> bool:
    return clean_env_value("ENABLE_PII_REDACTION").lower() != "false"


def prompt_sanitizer_level() -> str:
    return clean_env_value("PROMPT_SANITIZER_LEVEL").lower() or "moderate"


def sanitize_text(text: str, *, redact_pii: bool | None = None, sanitize_instructions: bool = True) -> SanitizationResult:
    value = str(text or "")
    should_redact = pii_redaction_enabled() if redact_pii is None else redact_pii
    pii_count = 0
    injection_count = 0

    if should_redact:
        for pattern, replacement in (
            (_EMAIL_RE, "[PII_EMAIL_REDACTED]"),
            (_SSN_RE, "[PII_SSN_REDACTED]"),
            (_PHONE_RE, "[PII_PHONE_REDACTED]"),
            (_CARD_RE, "[PII_CARD_REDACTED]"),
        ):
            value, count = pattern.subn(replacement, value)
            pii_count += count

    if sanitize_instructions and prompt_sanitizer_level() != "off":
        value, injection_count = _PROMPT_INJECTION_RE.subn("[PROMPT_INSTRUCTION_REDACTED]", value)

    return SanitizationResult(
        text=value,
        pii_redactions=pii_count,
        prompt_injection_redactions=injection_count,
    )


def sanitize_for_llm(text: str) -> str:
    return sanitize_text(text).text
