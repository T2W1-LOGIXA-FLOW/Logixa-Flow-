import pytest
from unittest.mock import MagicMock
from sqlalchemy.orm import Session
from ..llm.router import LLMRouter
from .. import models

def test_router_fallback_when_selected_key_missing(monkeypatch):
    # Remove all API keys
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    
    db = MagicMock(spec=Session)
    setting = models.AppSetting(key="writer_ai_model", value="gemini")
    db.query().filter().first.return_value = setting
    
    router = LLMRouter(db)
    provider = router.get_active_provider()
    assert provider.is_available() is True
    # Should fallback to local
    assert provider.__class__.__name__ == "FallbackLocalProvider"

def test_router_uses_selected_provider_if_available(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake_key_123")
    db = MagicMock()
    setting = models.AppSetting(key="writer_ai_model", value="gemini")
    db.query().filter().first.return_value = setting
    router = LLMRouter(db)
    provider = router.get_active_provider()
    assert provider.__class__.__name__ == "GeminiProvider"

def test_router_fallback_chain(monkeypatch):
    # No Gemini, but Groq key exists
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_API_KEY", "fake_groq_key")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    
    db = MagicMock()
    setting = models.AppSetting(key="writer_ai_model", value="gemini")
    db.query().filter().first.return_value = setting
    router = LLMRouter(db)
    provider = router.get_active_provider()
    assert provider.__class__.__name__ == "GroqProvider"

def test_router_generate_calls_provider(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake")
    db = MagicMock()
    setting = models.AppSetting(key="writer_ai_model", value="gemini")
    db.query().filter().first.return_value = setting
    
    # Mock the generate method
    router = LLMRouter(db)
    original_generate = router.providers["gemini"].generate
    router.providers["gemini"].generate = MagicMock(return_value="mocked response")
    
    result = router.generate("test prompt")
    assert result == "mocked response"
    router.providers["gemini"].generate.assert_called_once_with("test prompt")
    
    # Restore
    router.providers["gemini"].generate = original_generate