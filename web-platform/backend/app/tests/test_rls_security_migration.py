from __future__ import annotations

import ast
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from .. import models
from ..database import get_db
from ..main import app
from ..routers import posts


MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "migrations"
    / "versions"
    / "20261003_0005_supabase_rls_grants.py"
)


def test_rls_migration_covers_all_application_tables_and_legacy_sql_tables() -> None:
    source = MIGRATION.read_text(encoding="utf-8")
    module = ast.parse(source)
    table_assignment = next(
        node
        for node in module.body
        if isinstance(node, ast.Assign)
        and any(isinstance(target, ast.Name) and target.id == "APPLICATION_TABLES" for target in node.targets)
    )
    covered_tables = set(ast.literal_eval(table_assignment.value))
    model_tables = set(models.Base.metadata.tables)
    stale_sql_tables = {
        "contact_submissions",
        "subscriptions",
        "payment_history",
        "admin_activity_logs",
    }

    assert model_tables <= covered_tables
    assert stale_sql_tables <= covered_tables
    rls_block = source.split("DO $rls$", 1)[1].split("$rls$", 1)[0]
    assert all(f"'{table}'" in rls_block for table in covered_tables)


def test_rls_migration_enables_rls_and_revokes_direct_client_table_and_sequence_access() -> None:
    source = MIGRATION.read_text(encoding="utf-8").upper()

    assert "ENABLE ROW LEVEL SECURITY" in source
    assert "REVOKE ALL PRIVILEGES ON TABLE" in source
    assert "REVOKE ALL PRIVILEGES ON SEQUENCE" in source
    assert "FROM PUBLIC" in source
    assert "'ANON'" in source
    assert "'AUTHENTICATED'" in source
    assert "ALTER DEFAULT PRIVILEGES" in source
    assert "CREATE POLICY" not in source
    assert "GRANT ALL PRIVILEGES ON TABLE %I.%I TO SERVICE_ROLE" in source
    assert "TO SERVICE_ROLE" in source
    assert "TO ANON" not in source
    assert "TO AUTHENTICATED" not in source


def test_rls_migration_downgrade_does_not_reopen_direct_client_access() -> None:
    source = MIGRATION.read_text(encoding="utf-8")
    downgrade = source.split("def downgrade()", 1)[1]

    assert "ENABLE ROW LEVEL SECURITY" not in downgrade
    assert "GRANT " not in downgrade
    assert "pass" in downgrade


def test_migration_chain_extends_current_head() -> None:
    source = MIGRATION.read_text(encoding="utf-8")

    assert 'revision = "20261003_0005"' in source
    assert 'down_revision = "20260902_0004"' in source


def test_rls_migration_is_postgresql_only() -> None:
    source = MIGRATION.read_text(encoding="utf-8")
    upgrade = source.split("def upgrade()", 1)[1].split("def downgrade()", 1)[0]

    assert 'if op.get_bind().dialect.name != "postgresql":' in upgrade


def test_public_published_posts_remain_available_through_the_backend_api(
    monkeypatch,
) -> None:
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    models.Base.metadata.create_all(bind=test_engine)
    test_session = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)
    with test_session() as db:
        db.add(
            models.Post(
                title="Public logistics update",
                slug="public-logistics-update",
                type="news",
                category="Logistics",
                excerpt="Public API test",
                content_html="Published through the backend API",
                is_published=True,
                status="published",
            )
        )
        db.commit()

    def override_get_db():
        db = test_session()
        try:
            yield db
        finally:
            db.close()

    monkeypatch.setattr(posts.cache_client, "get", lambda *args, **kwargs: None)
    monkeypatch.setattr(posts.cache_client, "set", lambda *args, **kwargs: None)
    app.dependency_overrides[get_db] = override_get_db
    try:
        response = TestClient(app).get("/api/posts")
    finally:
        app.dependency_overrides.pop(get_db, None)
        test_engine.dispose()

    assert response.status_code == 200
    assert response.json()[0]["slug"] == "public-logistics-update"
