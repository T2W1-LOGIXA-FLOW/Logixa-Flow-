from __future__ import annotations

import os
from pathlib import Path
from typing import Final

from dotenv import load_dotenv

ROOT_DIR: Final[Path] = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR.parent / ".env")
load_dotenv(ROOT_DIR / ".env", override=True)
DATA_DIR: Final[Path] = ROOT_DIR / "data"
RAW_DIR: Final[Path] = DATA_DIR / "raw"
PROCESSED_DIR: Final[Path] = DATA_DIR / "processed"
DRAFTS_DIR: Final[Path] = DATA_DIR / "drafts"
MEMORY_DB_PATH: Final[Path] = DATA_DIR / "memory.sqlite3"

for directory in (RAW_DIR, PROCESSED_DIR, DRAFTS_DIR):
    directory.mkdir(parents=True, exist_ok=True)

RSS_FEEDS: Final[list[str]] = [
    "https://news.google.com/rss/search?q=supply+chain+management&hl=en-US&gl=US&ceid=US:en",
    "https://news.google.com/rss/search?q=logistics+technology+supply+chain&hl=en-US&gl=US&ceid=US:en",
    "https://www.supplychaindive.com/feeds/news/",
]

OPENAI_API_KEY: Final[str | None] = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY: Final[str | None] = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
OPENROUTER_API_KEY: Final[str | None] = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL_NAME: Final[str] = os.getenv("OPENROUTER_MODEL_NAME", "meta-llama/llama-3-8b-instruct:free")
OPENROUTER_FALLBACK_MODEL_NAME: Final[str] = os.getenv(
    "OPENROUTER_FALLBACK_MODEL_NAME", "deepseek/deepseek-r1:free"
)
GROQ_API_KEY: Final[str | None] = os.getenv("GROQ_API_KEY")
GROQ_MODEL_NAME: Final[str] = os.getenv("GROQ_MODEL_NAME", "llama-3.1-8b-instant")
HUGGINGFACE_API_KEY: Final[str | None] = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")
HUGGINGFACE_MODEL_NAME: Final[str] = os.getenv("HUGGINGFACE_MODEL_NAME", "")
LLM_PROVIDER: Final[str] = os.getenv("LLM_PROVIDER", "gemini").lower()
MODEL_NAME: Final[str] = os.getenv("MODEL_NAME", "gpt-4o-mini")
GEMINI_MODEL_NAME: Final[str] = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")
TEMPERATURE: Final[float] = float(os.getenv("TEMPERATURE", "0.55"))

BACKEND_URL: Final[str] = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
API_SECRET_TOKEN: Final[str] = os.getenv("API_SECRET_TOKEN", "")
ADMIN_USERNAME: Final[str] = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD: Final[str | None] = os.getenv("ADMIN_PASSWORD")

PIPELINE_BATCH_LIMIT: Final[int] = int(os.getenv("PIPELINE_BATCH_LIMIT", "8"))
MIN_SIMILARITY_TO_MERGE: Final[float] = float(os.getenv("MIN_SIMILARITY_TO_MERGE", "0.74"))
AUTO_APPROVE_PUBLISH: Final[bool] = os.getenv("AUTO_APPROVE_PUBLISH", "false").lower() == "true"
STRICT_LLM_ERRORS: Final[bool] = os.getenv("STRICT_LLM_ERRORS", "false").lower() == "true"
