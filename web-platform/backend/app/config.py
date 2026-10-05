from __future__ import annotations

import os


AI_PROVIDER_ENV_KEYS = (
    "GEMINI_API_KEY", "OPENROUTER_API_KEY", "GROQ_API_KEY", 
    "CEREBRAS_API_KEY", "MISTRAL_API_KEY", "COHERE_API_KEY", "NVIDIA_NIM_API_KEY"
)
S3_ENV_KEYS = ("S3_ENDPOINT_URL", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_BUCKET", "S3_PUBLIC_BASE_URL")

# Server-side AI safety controls. These default to enabled so production does not
# require a deployment-time opt-in to protect provider-bound prompts and outputs.
PII_REDACTION_ENABLED = os.getenv("ENABLE_PII_REDACTION", "true").lower() != "false"
PROMPT_SANITIZER_LEVEL = os.getenv("PROMPT_SANITIZER_LEVEL", "moderate").strip().lower() or "moderate"


def resolve_ai_key_for_role(role: str, provider_env_key: str) -> str:
    """Resolve a role-aware provider key with a clear user/admin split.

    Role-specific keys are preferred so public user flows and admin/agent flows can
    use separate credentials without leaking admin access into the public assistant.
    """
    normalized_role = (role or "").strip().lower()
    if normalized_role in {"user", "admin"}:
        role_key = f"{normalized_role.upper()}_{provider_env_key}"
        value = clean_env_value(role_key)
        if value:
            return value
    value = clean_env_value(provider_env_key)
    return value or ""


def clean_env_value(key: str) -> str:
    value = os.getenv(key, "")
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1].strip()
    return value


def env_configured(key: str) -> bool:
    return bool(clean_env_value(key))


def _is_placeholder_secret(value: str | None) -> bool:
    if not value:
        return True
    return value.strip().lower().startswith("change-")


def ai_provider_configured(role: str | None = None) -> bool:
    """Return true when a provider key is configured for the given role or globally."""
    if role:
        return any(bool(resolve_ai_key_for_role(role, key)) for key in AI_PROVIDER_ENV_KEYS)
    return any(env_configured(key) or env_configured(f"USER_{key}") or env_configured(f"ADMIN_{key}") for key in AI_PROVIDER_ENV_KEYS)


def upload_storage_configured() -> bool:
    """Return true when the selected upload storage backend is usable."""
    backend = os.getenv("UPLOAD_STORAGE_BACKEND", os.getenv("STORAGE_BACKEND", "local")).lower()
    if backend == "local":
        return True
    if backend == "cloudinary":
        return all(env_configured(key) for key in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"))
    if backend == "supabase":
        return env_configured("SUPABASE_URL") and env_configured("SUPABASE_SERVICE_ROLE_KEY")
    if backend in {"b2", "r2", "s3"}:
        return all(env_configured(key) for key in S3_ENV_KEYS)
    return False


def validate_env() -> list[str]:
    """Validate required environment variables."""
    required = ["JWT_SECRET"]
    
    missing = [key for key in required if not env_configured(key)]
    if os.getenv("REQUIRE_AI_KEY", "false").lower() == "true" and not ai_provider_configured("user") and not ai_provider_configured("admin"):
        missing.append("one of GEMINI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY, or their USER_/ADMIN_ variants")
    
    # Production-specific checks
    is_production = os.getenv("ENVIRONMENT", "development").lower() in {"production", "prod"}
    if is_production:
        for key in ("JWT_SECRET", "API_SECRET_TOKEN"):
            secret = clean_env_value(key)
            if _is_placeholder_secret(secret):
                missing.append(f"{key} (must be configured safely in production)")
            elif len(secret) < 32:
                missing.append(f"{key} (must be at least 32 characters in production)")

        celery_enabled = os.getenv("CELERY_ENABLED", "false").lower() == "true"
        if celery_enabled and not env_configured("REDIS_URL"):
            missing.append("REDIS_URL (required when CELERY_ENABLED=true)")

        qstash_enabled = env_configured("QSTASH_TOKEN") or env_configured("QSTASH_DESTINATION_URL")
        if qstash_enabled:
            for key in ("QSTASH_TOKEN", "QSTASH_DESTINATION_URL", "QSTASH_CURRENT_SIGNING_KEY", "QSTASH_NEXT_SIGNING_KEY"):
                if not env_configured(key):
                    missing.append(f"{key} (required when QStash is enabled)")

        storage_backend = os.getenv("UPLOAD_STORAGE_BACKEND", "local").strip().lower()
        fallback_backends = [item.strip().lower() for item in os.getenv("STORAGE_FALLBACK_BACKENDS", "").split(",") if item.strip()]
        storage_backends = [storage_backend, *[item for item in fallback_backends if item != storage_backend]]
        for backend in storage_backends:
            if backend == "cloudinary":
                for key in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"):
                    if not env_configured(key):
                        missing.append(f"{key} (required for Cloudinary storage)")
            elif backend == "supabase":
                for key in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET"):
                    if not env_configured(key):
                        missing.append(f"{key} (required for Supabase Storage)")
            elif backend in {"b2", "r2", "s3"}:
                for key in S3_ENV_KEYS:
                    if not env_configured(key):
                        missing.append(f"{key} (required for S3-compatible storage fallback)")

    return missing


def provider_env_status() -> list[dict[str, str | bool]]:
    """Return safe, redacted provider configuration status for admin UI."""
    providers = [
        {
            "key": "gemini",
            "label": "Gemini AI",
            "env": "GEMINI_API_KEY",
            "required": os.getenv("REQUIRE_AI_KEY", "false").lower() == "true",
        },
        {
            "key": "openrouter",
            "label": "OpenRouter AI",
            "env": "OPENROUTER_API_KEY",
            "required": False,
        },
        {
            "key": "groq",
            "label": "Groq AI",
            "env": "GROQ_API_KEY",
            "required": False,
        },
        {
            "key": "huggingface",
            "label": "Hugging Face Moderation",
            "env": "HUGGINGFACE_API_KEY",
            "required": False,
        },
        {
            "key": "redis",
            "label": "Redis Cache",
            "env": "REDIS_URL",
            "required": False,
        },
        {
            "key": "upload_storage",
            "label": "Upload Storage",
            "env": "UPLOAD_STORAGE_BACKEND",
            "required": False,
            "configured_override": upload_storage_configured(),
        },
        {
            "key": "jwt",
            "label": "JWT Secret",
            "env": "JWT_SECRET",
            "required": True,
        },
        {
            "key": "scheduler",
            "label": "Scheduler",
            "env": "ENABLE_SCHEDULER",
            "required": False,
        },
    ]

    status: list[dict[str, str | bool]] = []
    for provider in providers:
        env_name = str(provider["env"])
        configured = bool(provider.get("configured_override", env_configured(env_name) or env_configured(f"USER_{env_name}") or env_configured(f"ADMIN_{env_name}")))
        status.append(
            {
                "key": str(provider["key"]),
                "label": str(provider["label"]),
                "env": env_name,
                "configured": configured,
                "required": bool(provider["required"]),
                "state": "ready" if configured else ("missing" if provider["required"] else "fallback"),
            }
        )
    return status
