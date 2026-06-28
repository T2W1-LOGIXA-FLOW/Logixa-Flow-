from sqlalchemy.orm import Session
from .providers import *
from .. import models

class LLMRouter:
    def __init__(self, db: Session):
        self.db = db
        self.providers = {
            "gemini": GeminiProvider(),
            "openrouter-llama": OpenRouterProvider(model="meta-llama/llama-3-70b-instruct"),
            "openrouter-deepseek": OpenRouterProvider(model="deepseek/deepseek-r1"),
            "groq": GroqProvider(),
            "local": FallbackLocalProvider(),
        }
    
    def get_active_provider(self) -> LLMProvider:
        # Read selected provider from app_settings (key "writer_ai_model")
        setting = self.db.query(models.AppSetting).filter(
            models.AppSetting.key == "writer_ai_model"
        ).first()
        selected = setting.value if setting else "gemini"
        
        # Check if selected provider exists and is available
        if selected in self.providers and self.providers[selected].is_available():
            return self.providers[selected]
        
        # Fallback chain
        fallback_order = ["groq", "openrouter-llama", "openrouter-deepseek", "local"]
        for name in fallback_order:
            if name in self.providers and self.providers[name].is_available():
                return self.providers[name]
        
        # Ultimate fallback
        return FallbackLocalProvider()
    
    def generate(self, prompt: str, **kwargs) -> str:
        provider = self.get_active_provider()
        return provider.generate(prompt, **kwargs)