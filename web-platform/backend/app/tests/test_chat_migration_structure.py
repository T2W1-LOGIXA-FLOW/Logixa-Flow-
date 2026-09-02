from pathlib import Path


MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "migrations"
    / "versions"
    / "20260902_0004_chat_session_owner.py"
)


def test_chat_session_migration_is_additive_and_reversible():
    source = MIGRATION.read_text(encoding="utf-8")

    assert 'revision = "20260902_0004"' in source
    assert 'down_revision = "20260606_0003"' in source
    assert 'sa.Column("owner_id", sa.String(length=255), nullable=True)' in source
    assert 'sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)' in source
    assert 'sa.Column("deleted_by", sa.String(length=255), nullable=True)' in source
    assert 'op.create_index("ix_chat_sessions_owner_id", "chat_sessions", ["owner_id"])' in source
    assert 'op.drop_index("ix_chat_sessions_owner_id", table_name="chat_sessions")' in source
    assert 'op.drop_column("chat_sessions", "owner_id")' in source
    assert 'op.drop_column("chat_sessions", "deleted_at")' in source
    assert 'op.drop_column("chat_sessions", "deleted_by")' in source

    forbidden_operations = (
        "UPDATE chat_sessions",
        "DELETE FROM chat_sessions",
        "backfill",
        "purge",
        "bulk_update",
    )
    assert not any(operation.lower() in source.lower() for operation in forbidden_operations)
