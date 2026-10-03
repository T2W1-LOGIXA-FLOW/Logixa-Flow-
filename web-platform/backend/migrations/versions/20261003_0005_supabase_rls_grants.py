"""enable RLS and revoke direct client privileges on application tables

Revision ID: 20261003_0005
Revises: 20260902_0004
Create Date: 2026-10-03
"""
from __future__ import annotations

from alembic import op

revision = "20261003_0005"
down_revision = "20260902_0004"
branch_labels = None
depends_on = None


APPLICATION_TABLES = (
    "agent_feedback_events",
    "agent_runs",
    "agent_steps",
    "ai_memory_brain",
    "analytics_events",
    "api_usage_logs",
    "app_settings",
    "admin_activity_logs",
    "chat_messages",
    "chat_sessions",
    "comments",
    "company_budgets",
    "contact_submissions",
    "contacts",
    "content_submissions",
    "controllers",
    "dashboard_metrics",
    "document_embeddings",
    "email_templates",
    "estimation_history",
    "expense_categories",
    "feed_sources",
    "intelligence_sources",
    "logistics_estimates",
    "payment_history",
    "posts",
    "project_revenues",
    "scheduled_workflow_jobs",
    "subscribers",
    "subscriptions",
    "vehicle_types",
    "workflow_nodes",
    "workflow_runs",
    "workflows",
)


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return

    # Runtime bootstrap currently creates tables before optionally running Alembic.
    # Missing optional/legacy tables are therefore skipped without blocking startup.
    op.execute(
        """
        DO $rls$
        DECLARE
            app_table text;
            app_sequence regclass;
            client_role text;
        BEGIN
            FOREACH app_table IN ARRAY ARRAY[
                'agent_feedback_events', 'agent_runs', 'agent_steps', 'ai_memory_brain',
                'analytics_events', 'api_usage_logs', 'app_settings', 'admin_activity_logs',
                'chat_messages', 'chat_sessions', 'comments', 'company_budgets',
                'contact_submissions', 'contacts', 'content_submissions', 'controllers',
                'dashboard_metrics', 'document_embeddings', 'email_templates',
                'estimation_history', 'expense_categories', 'feed_sources',
                'intelligence_sources', 'logistics_estimates', 'payment_history',
                'posts', 'project_revenues', 'scheduled_workflow_jobs', 'subscribers',
                'subscriptions', 'vehicle_types', 'workflow_nodes', 'workflow_runs',
                'workflows'
            ] LOOP
                IF to_regclass(format('%I.%I', 'public', app_table)) IS NULL THEN
                    CONTINUE;
                END IF;

                EXECUTE format(
                    'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
                    'public', app_table
                );
                EXECUTE format(
                    'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM PUBLIC',
                    'public', app_table
                );

                FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
                        EXECUTE format(
                            'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM %I',
                            'public', app_table, client_role
                        );
                    END IF;
                END LOOP;
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
                    EXECUTE format(
                        'GRANT ALL PRIVILEGES ON TABLE %I.%I TO service_role',
                        'public', app_table
                    );
                END IF;

                FOR app_sequence IN
                    SELECT sequence_relation.oid::regclass
                    FROM pg_class AS table_relation
                    JOIN pg_namespace AS table_schema
                      ON table_schema.oid = table_relation.relnamespace
                    JOIN pg_depend AS sequence_dependency
                      ON sequence_dependency.refobjid = table_relation.oid
                     AND sequence_dependency.refobjsubid > 0
                     AND sequence_dependency.classid = 'pg_class'::regclass
                     AND sequence_dependency.refclassid = 'pg_class'::regclass
                     AND sequence_dependency.deptype IN ('a', 'i')
                    JOIN pg_class AS sequence_relation
                      ON sequence_relation.oid = sequence_dependency.objid
                     AND sequence_relation.relkind = 'S'
                    WHERE table_schema.nspname = 'public'
                      AND table_relation.relname = app_table
                LOOP
                    EXECUTE format(
                        'REVOKE ALL PRIVILEGES ON SEQUENCE %s FROM PUBLIC',
                        app_sequence
                    );
                    FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
                            EXECUTE format(
                                'REVOKE ALL PRIVILEGES ON SEQUENCE %s FROM %I',
                                app_sequence, client_role
                            );
                        END IF;
                    END LOOP;
                    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
                        EXECUTE format(
                            'GRANT ALL PRIVILEGES ON SEQUENCE %s TO service_role',
                            app_sequence
                        );
                    END IF;
                END LOOP;
            END LOOP;
        END;
        $rls$;
        """
    )

    # Prevent broad client grants from being inherited by future objects created
    # by the migration/bootstrap role in this schema.
    op.execute(
        """
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
        REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC
        """
    )
    op.execute(
        """
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
        REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC
        """
    )
    op.execute(
        """
        DO $defaults$
        DECLARE
            client_role text;
        BEGIN
            FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
                    EXECUTE format(
                        'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM %I',
                        client_role
                    );
                    EXECUTE format(
                        'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I',
                        client_role
                    );
                END IF;
            END LOOP;
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
                EXECUTE
                    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO service_role';
                EXECUTE
                    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO service_role';
            END IF;
        END;
        $defaults$;
        """
    )


def downgrade() -> None:
    # Reversing this baseline could silently restore client access or disable RLS.
    # Keep the stricter privileges and RLS in place when rolling back later schema work.
    pass
