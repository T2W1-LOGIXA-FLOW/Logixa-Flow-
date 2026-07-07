from abc import ABC, abstractmethod
import os
import json
import requests
from typing import Optional

class LLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> str:
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        pass

class GeminiProvider(LLMProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def generate(self, prompt: str, **kwargs) -> str:
        # Minimal working example – replace with actual Gemini API call
        if not self.is_available():
            raise Exception("Gemini API key missing")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        resp = requests.post(url, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]

class OpenRouterProvider(LLMProvider):
    def __init__(self, model: str, api_key: Optional[str] = None):
        self.model = model  # e.g., "meta-llama/llama-3-70b-instruct"
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
    
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
        self.model = model or os.getenv("GROQ_MODEL", "llama3-70b-8192")
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
    
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
        return "[Fallback Local Mode] This is a simulated response. Please set an API key for Gemini/Groq/OpenRouter to get real AI responses."
