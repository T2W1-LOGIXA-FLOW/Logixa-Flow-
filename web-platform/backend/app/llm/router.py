import os

from sqlalchemy.orm import Session
from .providers import *
from .. import models

class LLMRouter:
    def __init__(self, db: Session):
        self.db = db
        self.providers = {
            "gemini": GeminiProvider(),
            "openrouter-llama": OpenRouterProvider(
                model=os.getenv("OPENROUTER_LLAMA_MODEL", "meta-llama/llama-3-70b-instruct")
            ),
            "openrouter-deepseek": OpenRouterProvider(
                model=os.getenv("OPENROUTER_DEEPSEEK_MODEL", "deepseek/deepseek-r1")
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

    def get_active_provider(self) -> LLMProvider:
        for _, provider in self._provider_order():
            return provider
        return FallbackLocalProvider()

    def generate_with_provider(self, prompt: str, **kwargs) -> tuple[str, str]:
        for name, provider in self._provider_order():
            try:
                return provider.generate(prompt, **kwargs), getattr(provider, "model", name)
            except Exception:
                continue
        provider = FallbackLocalProvider()
        return provider.generate(prompt, **kwargs), "local"
    
    def generate(self, prompt: str, **kwargs) -> str:
        response, _ = self.generate_with_provider(prompt, **kwargs)
        return response
