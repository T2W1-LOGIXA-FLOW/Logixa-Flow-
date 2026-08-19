from __future__ import annotations

import os


AI_PROVIDER_ENV_KEYS = ("GEMINI_API_KEY", "OPENROUTER_API_KEY", "GROQ_API_KEY")
S3_ENV_KEYS = ("S3_ENDPOINT_URL", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_BUCKET", "S3_PUBLIC_BASE_URL")


def ai_provider_configured() -> bool:
    """Return true when at least one text-generation provider key is configured."""
    return any(bool(os.getenv(key)) for key in AI_PROVIDER_ENV_KEYS)


def upload_storage_configured() -> bool:
    """Return true when the selected upload storage backend is usable."""
    backend = os.getenv("UPLOAD_STORAGE_BACKEND", os.getenv("STORAGE_BACKEND", "local")).lower()
    if backend == "local":
        return True
    if backend in {"b2", "r2", "s3"}:
        return all(bool(os.getenv(key)) for key in S3_ENV_KEYS)
    return False


def validate_env() -> list[str]:
    """Validate required environment variables."""
    required = ["JWT_SECRET", "ADMIN_PASSWORD"]
    
    missing = [key for key in required if not os.getenv(key)]
    if os.getenv("REQUIRE_AI_KEY", "false").lower() == "true" and not ai_provider_configured():
        missing.append("one of GEMINI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY")
    
    # Production-specific checks
    is_production = os.getenv("ENVIRONMENT", "development").lower() in {"production", "prod"}
    if is_production:
        # Check for default secrets in production
        jwt_secret = os.getenv("JWT_SECRET", "")
        api_secret = os.getenv("API_SECRET_TOKEN", "")
        
        if jwt_secret in {"change-me-in-production", ""}:
            missing.append("JWT_SECRET (cannot use default in production)")
        if api_secret in {"change-me-in-production", ""}:
            missing.append("API_SECRET_TOKEN (cannot use default in production)")
    
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
            "key": "admin_password",
            "label": "Admin Password",
            "env": "ADMIN_PASSWORD",
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
        value = os.getenv(env_name)
        configured = bool(provider.get("configured_override", bool(value)))
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
