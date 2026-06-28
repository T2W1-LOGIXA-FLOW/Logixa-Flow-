from __future__ import annotations

import hashlib
import math
import sqlite3
from collections import Counter
from datetime import UTC, datetime

from config import MEMORY_DB_PATH


class MemoryAnalytics:
    def __init__(self, db_path=MEMORY_DB_PATH) -> None:
        self.db_path = db_path
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def _init_db(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS post_vectors (
                    source_id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    text TEXT NOT NULL,
                    vector TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS performance (
                    slug TEXT PRIMARY KEY,
                    views INTEGER DEFAULT 0,
                    clicks INTEGER DEFAULT 0,
                    shares INTEGER DEFAULT 0,
                    avg_read_seconds REAL DEFAULT 0,
                    updated_at TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS style_preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    preference TEXT NOT NULL UNIQUE,
                    weight REAL DEFAULT 1,
                    updated_at TEXT NOT NULL
                )
                """
            )

    def embed_text(self, text: str, dimensions: int = 64) -> list[float]:
        buckets = [0.0] * dimensions
        for token, count in Counter(text.lower().split()).items():
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:2], "big") % dimensions
            sign = 1 if digest[2] % 2 == 0 else -1
            buckets[index] += sign * math.log1p(count)
        norm = math.sqrt(sum(value * value for value in buckets)) or 1.0
        return [round(value / norm, 6) for value in buckets]

    def remember_vector(self, source_id: str, title: str, text: str) -> None:
        vector = ",".join(map(str, self.embed_text(text)))
        with self._connect() as connection:
            connection.execute(
                """
                INSERT OR REPLACE INTO post_vectors(source_id, title, text, vector, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (source_id, title, text, vector, datetime.now(UTC).isoformat()),
            )

    def record_performance(
        self, slug: str, views: int = 0, clicks: int = 0, shares: int = 0, avg_read_seconds: float = 0
    ) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO performance(slug, views, clicks, shares, avg_read_seconds, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(slug) DO UPDATE SET
                    views=excluded.views,
                    clicks=excluded.clicks,
                    shares=excluded.shares,
                    avg_read_seconds=excluded.avg_read_seconds,
                    updated_at=excluded.updated_at
                """,
                (slug, views, clicks, shares, avg_read_seconds, datetime.now(UTC).isoformat()),
            )

    def upsert_style_preference(self, preference: str, weight: float = 1.0) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO style_preferences(preference, weight, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(preference) DO UPDATE SET
                    weight=style_preferences.weight + excluded.weight,
                    updated_at=excluded.updated_at
                """,
                (preference, weight, datetime.now(UTC).isoformat()),
            )

    def get_style_preferences(self) -> list[str]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT preference FROM style_preferences ORDER BY weight DESC, updated_at DESC LIMIT 8"
            ).fetchall()
        return [row[0] for row in rows]
