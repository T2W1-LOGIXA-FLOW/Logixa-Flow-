from abc import ABC, abstractmethod
import os
import requests
from typing import Optional


def clean_env_value(name: str) -> Optional[str]:
    value = os.getenv(name)
    if value is None:
        return None
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1].strip()
    return value or None


def resolve_provider_key(provider_env_name: str, role: str = "admin") -> Optional[str]:
    normalized_role = (role or "").strip().lower()
    candidates = []
    if normalized_role in {"user", "admin"}:
        candidates.append(f"{normalized_role.upper()}_{provider_env_name}")
    candidates.append(provider_env_name)

    for env_name in candidates:
        value = clean_env_value(env_name)
        if value:
            return value
    return None


class LLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> str:
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        pass

class GeminiProvider(LLMProvider):
    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None, role: str = "admin"):
        self.model = model or clean_env_value("GEMINI_MODEL") or "gemini-2.5-flash"
        self.api_key = api_key or resolve_provider_key("GEMINI_API_KEY", role)
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def generate(self, prompt: str, **kwargs) -> str:
        if not self.is_available():
            raise Exception("Gemini API key missing")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        headers = {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]

class OpenRouterProvider(LLMProvider):
    def __init__(self, model: str, api_key: Optional[str] = None, role: str = "admin"):
        requested_model = (model or "").strip()
        # Never send a paid model ID through this provider. The free router is
        # always zero-priced and automatically selects a currently available
        # free chat model; explicit :free variants are also zero-priced.
        self.model = (
            requested_model
            if requested_model == "openrouter/free" or requested_model.endswith(":free")
            else "openrouter/free"
        )
        self.api_key = api_key or resolve_provider_key("OPENROUTER_API_KEY", role)
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def generate(self, prompt: str, **kwargs) -> str:
        if not self.is_available():
            raise Exception("OpenRouter API key missing")
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}]
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

class GroqProvider(LLMProvider):
    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None, role: str = "admin"):
        self.model = model or clean_env_value("GROQ_MODEL") or "llama-3.1-8b-instant"
        self.api_key = api_key or resolve_provider_key("GROQ_API_KEY", role)
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def generate(self, prompt: str, **kwargs) -> str:
        if not self.is_available():
            raise Exception("Groq API key missing")
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}]
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

class FallbackLocalProvider(LLMProvider):
    def is_available(self) -> bool:
        return True
    
    def generate(self, prompt: str, **kwargs) -> str:
        return "[Fallback Local Model] This is a simulated backend response. Add a valid GEMINI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY to the backend environment and redeploy to enable real AI responses."
        
class CerebrasProvider(LLMProvider):
    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None, role: str = "admin"):
        self.model = model or clean_env_value("CEREBRAS_MODEL") or "gpt-oss-120b"
        self.api_key = api_key or resolve_provider_key("CEREBRAS_API_KEY", role)
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def generate(self, prompt: str, **kwargs) -> str:
        if not self.is_available():
            raise Exception("Cerebras API key missing")
        url = "https://api.cerebras.ai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}]
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


class MistralProvider(LLMProvider):
    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None, role: str = "admin"):
        self.model = model or clean_env_value("MISTRAL_MODEL") or "mistral-small-latest"
        self.api_key = api_key or resolve_provider_key("MISTRAL_API_KEY", role)
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def generate(self, prompt: str, **kwargs) -> str:
        if not self.is_available():
            raise Exception("Mistral API key missing")
        url = "https://api.mistral.ai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}]
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


class CohereProvider(LLMProvider):
    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None, role: str = "admin"):
        self.model = model or clean_env_value("COHERE_MODEL") or "command-r-plus"
        self.api_key = api_key or resolve_provider_key("COHERE_API_KEY", role)
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def generate(self, prompt: str, **kwargs) -> str:
        if not self.is_available():
            raise Exception("Cohere API key missing")
        url = "https://api.cohere.ai/compatibility/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}]
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


class NvidiaNimProvider(LLMProvider):
    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None, role: str = "admin"):
        self.model = model or clean_env_value("NVIDIA_NIM_MODEL") or "meta/llama-3.1-8b-instruct"
        self.api_key = api_key or resolve_provider_key("NVIDIA_NIM_API_KEY", role)
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def generate(self, prompt: str, **kwargs) -> str:
        if not self.is_available():
            raise Exception("NVIDIA NIM API key missing")
        url = "https://integrate.api.nvidia.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}]
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
