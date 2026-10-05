from __future__ import annotations

import ast
import os
from pathlib import Path
from unittest.mock import patch

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from .. import models
from .. import db_bootstrap


BACKEND_DIR = Path(__file__).resolve().parents[2]
MIGRATIONS_DIR = BACKEND_DIR / "migrations"
RLS_MIGRATION = MIGRATIONS_DIR / "versions" / "20261003_0005_supabase_rls_grants.py"
SCHEMA_MIGRATION = (
    MIGRATIONS_DIR / "versions" / "20261003_0006_reconcile_current_application_schema.py"
)
MONEY_MIGRATION = (
    MIGRATIONS_DIR / "versions" / "20261005_0007_convert_money_to_numeric.py"
)
CURRENT_HEAD = "20261005_0009"


def alembic_config(database_url: str) -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(MIGRATIONS_DIR))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def run_alembic(operation, database_url: str, revision: str) -> None:
    with patch.dict(os.environ, {"DATABASE_URL": database_url}):
        operation(alembic_config(database_url), revision)


def test_fresh_alembic_upgrade_creates_current_model_schema(tmp_path) -> None:
    database_url = f"sqlite:///{(tmp_path / 'fresh.db').as_posix()}"
    run_alembic(command.upgrade, database_url, "head")

    engine = create_engine(database_url)
    try:
        schema = inspect(engine)
        assert set(models.Base.metadata.tables) <= set(schema.get_table_names())
        for table in models.Base.metadata.sorted_tables:
            actual_columns = {column["name"] for column in schema.get_columns(table.name)}
            assert {column.name for column in table.columns} <= actual_columns
            actual_indexes = {index["name"] for index in schema.get_indexes(table.name)}
            assert {index.name for index in table.indexes} <= actual_indexes
            primary_key = schema.get_pk_constraint(table.name)["constrained_columns"]
            assert set(primary_key or ()) == {
                column.name for column in table.primary_key.columns
            }
            actual_foreign_keys = {
                (
                    tuple(foreign_key["constrained_columns"]),
                    foreign_key["referred_table"],
                    tuple(foreign_key["referred_columns"]),
                )
                for foreign_key in schema.get_foreign_keys(table.name)
            }
            expected_foreign_keys = {
                (
                    (foreign_key.parent.name,),
                    foreign_key.column.table.name,
                    (foreign_key.column.name,),
                )
                for column in table.columns
                for foreign_key in column.foreign_keys
            }
            assert expected_foreign_keys <= actual_foreign_keys

        with engine.connect() as connection:
            revision = connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
        assert revision == CURRENT_HEAD
    finally:
        engine.dispose()


def test_schema_reconciliation_follows_rls_and_secures_every_model_table() -> None:
    source = SCHEMA_MIGRATION.read_text(encoding="utf-8")
    module = ast.parse(source)
    assignment = next(
        node
        for node in module.body
        if isinstance(node, ast.Assign)
        and any(
            isinstance(target, ast.Name) and target.id == "APPLICATION_TABLES"
            for target in node.targets
        )
    )
    protected_tables = set(ast.literal_eval(assignment.value))
    assert (set(models.Base.metadata.tables) - {"audit_events"}) <= protected_tables
    assert "revision = '20261003_0006'" in source
    assert "down_revision = '20261003_0005'" in source
    assert "ENABLE ROW LEVEL SECURITY" in source
    assert "REVOKE ALL PRIVILEGES ON TABLE" in source
    assert "CREATE POLICY" not in source

    money_source = MONEY_MIGRATION.read_text(encoding="utf-8")
    assert "revision = \"20261005_0007\"" in money_source
    assert "down_revision = \"20261003_0006\"" in money_source
    assert "Numeric(18, 6" in money_source

    queue_source = (
        MIGRATIONS_DIR / "versions" / "20261005_0008_workflow_job_claim_metadata.py"
    ).read_text(encoding="utf-8")
    assert "revision = \"20261005_0008\"" in queue_source
    assert "down_revision = \"20261005_0007\"" in queue_source
    assert "claimed_by" in queue_source
    assert "claimed_at" in queue_source

    audit_source = (
        MIGRATIONS_DIR / "versions" / "20261005_0009_audit_events.py"
    ).read_text(encoding="utf-8")
    assert "revision = \"20261005_0009\"" in audit_source
    assert "down_revision = \"20261005_0008\"" in audit_source
    assert 'op.create_table("audit_events"' in audit_source

    rls_source = RLS_MIGRATION.read_text(encoding="utf-8")
    assert 'revision = "20261003_0005"' in rls_source
    assert 'down_revision = "20260902_0004"' in rls_source


def test_existing_pre_batch_schema_upgrade_preserves_rows(tmp_path) -> None:
    database_url = f"sqlite:///{(tmp_path / 'existing.db').as_posix()}"
    run_alembic(command.upgrade, database_url, "20260606_0003")

    engine = create_engine(database_url)
    try:
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO posts (
                        id, title, slug, type, category, excerpt, content_html, image_url,
                        source_url, is_published, status, published_at, created_at, updated_at
                    ) VALUES (
                        1, 'Existing post', 'existing-post', 'news', 'Supply Chain', '',
                        'Retain this record', NULL, NULL, 0, 'draft', NULL, CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO ai_memory_brain (
                        id, category, source_title, prompt, content, summary, status, is_public,
                        confidence_score, hallucination_score, created_at, updated_at
                    ) VALUES (
                        1, 'Supply Chain', 'Existing memory', '', 'Preserve this memory', '',
                        'pending', 0, 0.5, 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO agent_runs (
                        id, objective, model, status, created_at, updated_at
                    ) VALUES (
                        1, 'Existing run', 'planner', 'completed', CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    """
                )
            )

        run_alembic(command.upgrade, database_url, "head")

        with engine.connect() as connection:
            row = connection.execute(
                text("SELECT id, content_html FROM posts WHERE id = 1")
            ).one()
            assert row == (1, "Retain this record")
            memory = connection.execute(
                text(
                    "SELECT feedback_score, source_ids, output_version "
                    "FROM ai_memory_brain WHERE id = 1"
                )
            ).one()
            assert memory == (0, "[]", 1)
            run = connection.execute(
                text(
                    "SELECT input_context, source_ids, output_version "
                    "FROM agent_runs WHERE id = 1"
                )
            ).one()
            assert run == ("{}", "[]", 1)
            assert connection.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalar_one() == CURRENT_HEAD
        assert set(models.Base.metadata.tables) <= set(inspect(engine).get_table_names())
    finally:
        engine.dispose()


def test_existing_runtime_model_schema_is_reconciled_without_data_loss(tmp_path) -> None:
    database_url = f"sqlite:///{(tmp_path / 'runtime-schema.db').as_posix()}"
    engine = create_engine(database_url)
    models.Base.metadata.create_all(bind=engine)
    try:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "INSERT INTO posts (title, slug, type, category, excerpt, content_html, "
                    "is_published, status, created_at, updated_at) VALUES "
                    "('Legacy', 'legacy-post', 'news', 'Supply Chain', '', 'keep', 0, "
                    "'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                )
            )
        run_alembic(command.stamp, database_url, "20261003_0005")
        run_alembic(command.upgrade, database_url, "head")

        with engine.connect() as connection:
            content = connection.execute(
                text("SELECT content_html FROM posts WHERE slug = 'legacy-post'")
            ).scalar_one()
        assert content == "keep"
    finally:
        engine.dispose()


def test_bootstrap_only_verifies_alembic_head_and_never_changes_schema(
    tmp_path, monkeypatch
) -> None:
    database_url = f"sqlite:///{(tmp_path / 'unmigrated.db').as_posix()}"
    engine = create_engine(database_url)
    monkeypatch.setattr(db_bootstrap, "engine", engine)
    try:
        try:
            db_bootstrap.bootstrap_database()
        except RuntimeError as exc:
            assert "alembic upgrade head" in str(exc)
        else:
            raise AssertionError("An unmigrated database must fail startup verification")
        assert inspect(engine).get_table_names() == []

        with engine.begin() as connection:
            connection.execute(
                text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)")
            )
            connection.execute(
                text("INSERT INTO alembic_version (version_num) VALUES (:revision)"),
                {"revision": CURRENT_HEAD},
            )
        try:
            db_bootstrap.bootstrap_database()
        except RuntimeError as exc:
            assert "missing application tables or columns" in str(exc)
        else:
            raise AssertionError("A stamped but incomplete schema must fail startup verification")
        assert inspect(engine).get_table_names() == ["alembic_version"]
    finally:
        engine.dispose()


def test_monetary_columns_are_numeric_after_current_head_upgrade(tmp_path) -> None:
    database_url = f"sqlite:///{(tmp_path / 'money-types.db').as_posix()}"
    run_alembic(command.upgrade, database_url, "head")

    engine = create_engine(database_url)
    expected = {
        "ai_memory_brain": {"cost_estimate"},
        "agent_runs": {"cost_estimate"},
        "api_usage_logs": {"cost"},
        "chat_messages": {"cost_estimate"},
        "company_budgets": {"total_budget", "spent_amount"},
        "expense_categories": {"budget"},
        "project_revenues": {"estimated_revenue", "estimated_cost", "actual_revenue", "actual_cost"},
    }
    try:
        schema = inspect(engine)
        for table, columns in expected.items():
            actual = {column["name"]: str(column["type"]).upper() for column in schema.get_columns(table)}
            for column in columns:
                assert "NUMERIC" in actual[column]
    finally:
        engine.dispose()
