from __future__ import annotations

import logging
import os
from pathlib import Path

from sqlalchemy import inspect, text

from .database import Base, engine

logger = logging.getLogger(__name__)


def database_profile() -> str:
    explicit = os.getenv("DATABASE_PROFILE", "").strip().lower()
    if explicit:
        return explicit
    url = os.getenv("DATABASE_URL", "")
    if url.startswith("postgresql"):
        if "neon.tech" in url:
            return "neon"
        if "supabase" in url:
            return "supabase"
        return "postgres"
    return "sqlite"


def run_alembic_upgrade() -> None:
    from alembic import command
    from alembic.config import Config

    backend_dir = Path(__file__).resolve().parents[1]
    cfg = Config(str(backend_dir / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        cfg.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(cfg, "head")
    logger.info("Alembic upgrade applied")


def bootstrap_database() -> None:
    # Always create tables from SQLAlchemy models first
    Base.metadata.create_all(bind=engine)
    
    # Then try Alembic migrations if enabled and models exist
    if os.getenv("USE_ALEMBIC_BOOTSTRAP", "false").lower() == "true":
        try:
            run_alembic_upgrade()
            logger.info("Alembic migrations applied")
            return
        except ImportError as exc:
            logger.warning("Alembic not installed: %s", exc)
        except Exception as exc:
            logger.warning("Alembic bootstrap failed: %s", exc)
    
    logger.info("Database bootstrapped with SQLAlchemy models")
    inspector = inspect(engine)
    if "document_embeddings" not in inspector.get_table_names():
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS document_embeddings (
                        id INTEGER PRIMARY KEY,
                        source_type VARCHAR(40) NOT NULL,
                        source_id VARCHAR(64) NOT NULL,
                        chunk_index INTEGER NOT NULL DEFAULT 0,
                        title VARCHAR(255) NOT NULL DEFAULT '',
                        content TEXT NOT NULL,
                        embedding_json TEXT NOT NULL,
                        embedding_model VARCHAR(120) NOT NULL DEFAULT 'hash:fallback',
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
            )
    if "agent_feedback_events" not in inspector.get_table_names():
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS agent_feedback_events (
                        id INTEGER PRIMARY KEY,
                        run_id INTEGER NOT NULL,
                        rating VARCHAR(20) NOT NULL,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
            )
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_agent_feedback_events_run_id ON agent_feedback_events (run_id)"))
