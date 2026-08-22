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


class LLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> str:
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        pass

class GeminiProvider(LLMProvider):
    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None):
        self.model = model or clean_env_value("GEMINI_MODEL") or "gemini-3.5-flash"
        self.api_key = api_key or clean_env_value("GEMINI_API_KEY")
    
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
    def __init__(self, model: str, api_key: Optional[str] = None):
        self.model = model  # e.g., "meta-llama/llama-3-70b-instruct"
        self.api_key = api_key or clean_env_value("OPENROUTER_API_KEY")
    
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
    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None):
        self.model = model or clean_env_value("GROQ_MODEL") or "llama-3.1-8b-instant"
        self.api_key = api_key or clean_env_value("GROQ_API_KEY")
    
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
    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None):
        self.model = model or clean_env_value("CEREBRAS_MODEL") or "llama-3.3-70b"
        self.api_key = api_key or clean_env_value("CEREBRAS_API_KEY")
    
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
    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None):
        self.model = model or clean_env_value("MISTRAL_MODEL") or "mistral-small-latest"
        self.api_key = api_key or clean_env_value("MISTRAL_API_KEY")
    
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
    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None):
        self.model = model or clean_env_value("COHERE_MODEL") or "command-r-plus"
        self.api_key = api_key or clean_env_value("COHERE_API_KEY")
    
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
    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None):
        self.model = model or clean_env_value("NVIDIA_NIM_MODEL") or "meta/llama-3.1-8b-instruct"
        self.api_key = api_key or clean_env_value("NVIDIA_NIM_API_KEY")
    
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
