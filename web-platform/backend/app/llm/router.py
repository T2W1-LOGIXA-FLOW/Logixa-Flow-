import os
import logging

from sqlalchemy.orm import Session
from .providers import (
    FallbackLocalProvider,
    GeminiProvider,
    GroqProvider,
    LLMProvider,
    OpenRouterProvider,
    clean_env_value,
)
from .. import models


logger = logging.getLogger(__name__)


class LLMRouter:
    def __init__(self, db: Session):
        self.db = db
        self.providers = {
            "gemini": GeminiProvider(),
            "openrouter-llama": OpenRouterProvider(
                model=clean_env_value("OPENROUTER_LLAMA_MODEL") or "meta-llama/llama-3-70b-instruct"
            ),
            "openrouter-deepseek": OpenRouterProvider(
                model=clean_env_value("OPENROUTER_DEEPSEEK_MODEL") or "deepseek/deepseek-r1"
            ),
            "groq": GroqProvider(),
            "local": FallbackLocalProvider(),
        }

    def _selected_provider_name(self) -> str:
        setting = self.db.query(models.AppSetting).filter(
            models.AppSetting.key == "writer_ai_model"
        ).first()
        selected = setting.value if setting else "gemini"
        aliases = {
            "llama3": "openrouter-llama",
            "deepseek": "openrouter-deepseek",
        }
        return aliases.get(selected, selected)

    def _provider_order(self) -> list[tuple[str, LLMProvider]]:
        selected = self._selected_provider_name()
        names = [selected, "gemini", "groq", "openrouter-llama", "openrouter-deepseek", "local"]
        ordered: list[tuple[str, LLMProvider]] = []
        seen: set[str] = set()
        for name in names:
            provider = self.providers.get(name)
            if provider is None or name in seen or not provider.is_available():
                continue
            ordered.append((name, provider))
            seen.add(name)
        return ordered

    def diagnostics(self) -> dict[str, object]:
        selected = self._selected_provider_name()
        order = []
        for name, provider in self._provider_order():
            order.append(
                {
                    "name": name,
                    "available": provider.is_available(),
                    "model": getattr(provider, "model", name),
                    "fallback": isinstance(provider, FallbackLocalProvider),
                }
            )
        active = order[0] if order else {"name": "local", "model": "local", "fallback": True}
        return {
            "selected_provider": selected,
            "active_provider": active["name"],
            "active_model": active["model"],
            "fallback_active": bool(active.get("fallback")),
            "order": order,
        }

    def get_active_provider(self) -> LLMProvider:
        for _, provider in self._provider_order():
            return provider
        return FallbackLocalProvider()

    def generate_with_provider(self, prompt: str, **kwargs) -> tuple[str, str]:
        provider_errors: list[str] = []
        for name, provider in self._provider_order():
            try:
                return provider.generate(prompt, **kwargs), getattr(provider, "model", name)
            except Exception as exc:
                error_summary = f"{name}: {exc.__class__.__name__}: {str(exc)[:300]}"
                provider_errors.append(error_summary)
                logger.warning("LLM provider failed; trying next provider. %s", error_summary)
                continue
        if provider_errors:
            logger.warning("All configured LLM providers failed; using local fallback. attempts=%s", provider_errors)
        else:
            logger.info("No configured LLM provider is available; using local fallback.")
        provider = FallbackLocalProvider()
        return provider.generate(prompt, **kwargs), "local"
    
    def generate(self, prompt: str, **kwargs) -> str:
        response, _ = self.generate_with_provider(prompt, **kwargs)
        return response
