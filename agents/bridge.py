from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import requests

from config import BACKEND_URL, DRAFTS_DIR, agent_service_headers


class LogixaWebBridge:
    """Connects the standalone agents folder to the FastAPI web platform (preview-safe)."""

    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = (base_url or BACKEND_URL).rstrip("/")

    def _headers(self) -> dict[str, str]:
        return agent_service_headers()

    def sync_feeds(self, limit_per_feed: int = 5) -> dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/api/admin/integration/sync-feeds",
            params={"limit_per_feed": limit_per_feed},
            headers=self._headers(),
            timeout=120,
        )
        response.raise_for_status()
        return response.json()

    def import_drafts(self, limit: int = 10) -> dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/api/admin/integration/import-drafts",
            params={"limit": limit},
            headers=self._headers(),
            timeout=120,
        )
        response.raise_for_status()
        return response.json()

    def import_draft_file(self, draft_path: Path) -> dict[str, Any]:
        draft = json.loads(draft_path.read_text(encoding="utf-8"))
        payload = {
            "title": draft.get("title", "CLI Draft"),
            "content_markdown": draft.get("content_markdown", ""),
            "source_url": draft.get("source_url"),
            "slug": draft.get("slug"),
            "category": draft.get("category", "Supply Chain"),
            "ai_model": draft.get("ai_model", "cli"),
        }
        response = requests.post(
            f"{self.base_url}/api/admin/integration/import-draft",
            json=payload,
            headers=self._headers(),
            timeout=60,
        )
        response.raise_for_status()
        return response.json()

    def ingest_rag(self, limit: int = 200) -> dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/api/admin/rag/ingest/sources",
            params={"limit": limit},
            headers=self._headers(),
            timeout=300,
        )
        response.raise_for_status()
        return response.json()

    def run_pipeline_preview(
        self,
        *,
        sync_feeds: bool = True,
        import_cli_drafts: bool = True,
        run_agent: bool = True,
        ingest_rag: bool = True,
        feed_limit: int = 5,
        draft_limit: int = 5,
    ) -> dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/api/admin/integration/pipeline-preview",
            params={
                "sync_feeds": sync_feeds,
                "import_cli_drafts": import_cli_drafts,
                "run_agent": run_agent,
                "ingest_rag": ingest_rag,
                "feed_limit": feed_limit,
                "draft_limit": draft_limit,
            },
            headers=self._headers(),
            timeout=300,
        )
        response.raise_for_status()
        return response.json()

    def import_all_recent_drafts(self, limit: int = 10) -> list[dict[str, Any]]:
        paths = sorted(DRAFTS_DIR.glob("*.json"), key=lambda item: item.stat().st_mtime, reverse=True)
        imported: list[dict[str, Any]] = []
        for path in paths[:limit]:
            try:
                imported.append(self.import_draft_file(path))
            except Exception as exc:
                print(f"Skip {path.name}: {exc}")
        return imported
