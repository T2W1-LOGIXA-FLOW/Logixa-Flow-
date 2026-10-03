from __future__ import annotations

import os
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from . import models
from .database import engine


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


def verify_database_migrations() -> None:
    """Fail startup unless the database has been upgraded by Alembic."""
    backend_dir = Path(__file__).resolve().parents[1]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "migrations"))
    expected_heads = set(ScriptDirectory.from_config(config).get_heads())

    try:
        with engine.connect() as connection:
            applied_revisions = set(
                connection.execute(text("SELECT version_num FROM alembic_version")).scalars()
            )
            schema = inspect(connection)
            schema_name = "public" if connection.dialect.name == "postgresql" else None
            existing_tables = set(schema.get_table_names(schema=schema_name))
            missing_tables = set(models.Base.metadata.tables) - existing_tables
            missing_columns = {
                f"{table.name}.{column.name}"
                for table in models.Base.metadata.sorted_tables
                if table.name in existing_tables
                for column in table.columns
                if column.name
                not in {
                    existing["name"]
                    for existing in schema.get_columns(table.name, schema=schema_name)
                }
            }
    except SQLAlchemyError as exc:
        raise RuntimeError(
            "Database Alembic revision is unavailable; run `python -m alembic upgrade head` "
            "before starting the application."
        ) from exc

    if applied_revisions != expected_heads:
        applied = ", ".join(sorted(applied_revisions)) or "none"
        expected = ", ".join(sorted(expected_heads))
        raise RuntimeError(
            f"Database schema is not at Alembic head (applied: {applied}; expected: {expected}). "
            "Run `python -m alembic upgrade head` before starting the application."
        )

    if missing_tables or missing_columns:
        missing = sorted(missing_tables | {name.split(".", 1)[0] for name in missing_columns})
        details = ", ".join(missing)
        raise RuntimeError(
            f"Database schema is missing application tables or columns ({details}); "
            "run `python -m alembic upgrade head` and verify the migration result."
        )


def bootstrap_database() -> None:
    """Compatibility entry point that verifies, but never mutates, database schema."""
    verify_database_migrations()
