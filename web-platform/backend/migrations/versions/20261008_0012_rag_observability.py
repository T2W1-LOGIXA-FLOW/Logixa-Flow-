from alembic import op
import sqlalchemy as sa

revision = "20261008_0012"
down_revision = "20261007_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rag_observability_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type", sa.String(60), nullable=False, index=True),
        sa.Column("operation", sa.String(60), nullable=False, index=True),
        sa.Column("payload", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("fingerprint", sa.String(128), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("rag_observability_events")
