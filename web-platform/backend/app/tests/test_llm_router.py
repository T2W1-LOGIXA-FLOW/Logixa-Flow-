import pytest
from unittest.mock import MagicMock
from sqlalchemy.orm import Session
from ..llm.router import LLMRouter, sanitize_provider_error
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
    assert provider.model == "gemini-2.5-flash"


def test_router_cleans_wrapped_provider_env_values(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", ' "fake_key_123" ')
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    db = MagicMock()
    setting = models.AppSetting(key="writer_ai_model", value="gemini")
    db.query().filter().first.return_value = setting

    router = LLMRouter(db)
    provider = router.get_active_provider()
    assert provider.__class__.__name__ == "GeminiProvider"
    assert provider.api_key == "fake_key_123"


def test_router_diagnostics_identifies_local_fallback(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    db = MagicMock()
    setting = models.AppSetting(key="writer_ai_model", value="gemini")
    db.query().filter().first.return_value = setting

    diagnostics = LLMRouter(db).diagnostics()
    assert diagnostics["selected_provider"] == "gemini"
    assert diagnostics["active_provider"] == "local"
    assert diagnostics["fallback_active"] is True

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
    assert provider.model == "llama-3.1-8b-instant"


def test_router_uses_current_openrouter_defaults(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("OPENROUTER_API_KEY", "fake_openrouter_key")

    db = MagicMock()
    setting = models.AppSetting(key="writer_ai_model", value="llama3")
    db.query().filter().first.return_value = setting

    router = LLMRouter(db)
    provider = router.get_active_provider()
    assert provider.__class__.__name__ == "OpenRouterProvider"
    assert provider.model == "meta-llama/llama-3.3-70b-instruct:free"


def test_router_uses_current_deepseek_default(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("OPENROUTER_API_KEY", "fake_openrouter_key")

    db = MagicMock()
    setting = models.AppSetting(key="writer_ai_model", value="deepseek")
    db.query().filter().first.return_value = setting

    router = LLMRouter(db)
    provider = router.get_active_provider()
    assert provider.__class__.__name__ == "OpenRouterProvider"
    assert provider.model == "deepseek/deepseek-r1:free"


def test_router_sanitizes_provider_error_secrets():
    message = (
        "HTTP 404 https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-2.5-flash:generateContent?key=AIzaExampleSecret1234567890 "
        "Authorization: Bearer sk-or-v1-exampleSecret1234567890 "
        "groq=gsk_exampleSecret1234567890 hf=hf_exampleSecret1234567890"
    )
    sanitized = sanitize_provider_error(message)
    assert "AIzaExampleSecret" not in sanitized
    assert "sk-or-v1-exampleSecret" not in sanitized
    assert "gsk_exampleSecret" not in sanitized
    assert "hf_exampleSecret" not in sanitized
    assert "key=[redacted]" in sanitized

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


def test_router_logs_provider_failure_before_local_fallback(monkeypatch, caplog):
    monkeypatch.setenv("GEMINI_API_KEY", "fake")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    db = MagicMock()
    setting = models.AppSetting(key="writer_ai_model", value="gemini")
    db.query().filter().first.return_value = setting

    router = LLMRouter(db)
    router.providers["gemini"].generate = MagicMock(side_effect=RuntimeError("provider down"))

    response, model = router.generate_with_provider("test prompt")

    assert model == "local"
    assert "[Fallback Local Model]" in response
    assert "LLM provider failed" in caplog.text
