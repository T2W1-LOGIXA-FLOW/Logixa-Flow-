from __future__ import annotations

import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from . import models
from .agent_recovery import recover_stale_agent_runs
from .cache import cache_client, rate_limiter
from .config import ai_feature_status, ai_provider_configured, telegram_configured, telegram_enabled, upload_storage_configured, validate_env
from .qstash import qstash_configured
from .database import SessionLocal
from .db_bootstrap import bootstrap_database, database_profile
from .logging_config import setup_logging
from .middleware import rate_limit_middleware, request_observability_middleware, security_headers_middleware, stealth_mode_middleware
from .routers import admin, agent, analytics, auth, brain, chat, contacts, controllers, costs, usage, finance, diagnostics, email_templates, estimator, integration, workflow, metrics, moderation, posts, rag, settings, submissions, subscribers, system, uploads, knowledge, telegram
from .scheduler import scheduler_status, start_scheduler

logger = logging.getLogger(__name__)
setup_logging()

if os.getenv("SENTRY_DSN", "").strip():
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        sentry_sdk.init(
            dsn=os.getenv("SENTRY_DSN").strip(),
            environment=os.getenv("APP_ENV", "production"),
            integrations=[FastApiIntegration()],
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.0")),
        )
        logger.info("Sentry monitoring initialized successfully.")
    except Exception as exc:
        logger.warning("Sentry initialization skipped: %s", exc)


def run_startup_tasks() -> None:
    """Verify the externally migrated schema before starting application tasks.
    
    NOTE: This function is called from within lifespan() via run_in_executor to avoid
    blocking the async event loop. time.sleep() is safe here because this runs in a
    thread pool, not the main async loop.
    """
    max_attempts = max(1, int(os.getenv("DB_CONNECT_RETRIES", "5")))
    retry_delay = int(os.getenv("DB_CONNECT_RETRY_DELAY", "3"))

    for attempt in range(1, max_attempts + 1):
        try:
            bootstrap_database()
            break
        except Exception as exc:
            if attempt >= max_attempts:
                logger.error("Database migration verification failed after %s attempts: %s", max_attempts, exc)
                raise
            logger.warning(
                "Database migration verification attempt %s/%s failed: %s — retrying in %ss",
                attempt,
                max_attempts,
                exc,
                retry_delay,
            )
            time.sleep(retry_delay)

    # Reconcile only interrupted AgentRun rows older than the configured stale threshold.
    recovery_db = SessionLocal()
    try:
        stale_count = recover_stale_agent_runs(recovery_db)
        if stale_count:
            logger.warning(
                "Marked %s stale agent run(s) failed after interrupted execution",
                stale_count,
                extra={"operation": "agent_run_stale_recovery", "recovered_count": stale_count},
            )
    except Exception as exc:
        logger.warning("Stale agent run recovery skipped: %s", type(exc).__name__)
    finally:
        recovery_db.close()

    if os.getenv("SKIP_SEEDING", "false").lower() != "true":
        seed_app_settings()
        seed_sample_posts()
        seed_brain_context()
    else:
        logger.info("Skipping seeding (SKIP_SEEDING=true)")

    try:
        restored = workflow.restore_pending_workflow_runs()
        logger.info("Workflow recovery restored %s pending run(s)", restored)
        if os.getenv("CELERY_ENABLED", "false").lower() == "true":
            now = time.time()
            for item in list(workflow._EXECUTION_QUEUE):
                delay_seconds = max(int(item["scheduled_for"].timestamp() - now), 0)
                workflow._dispatch_workflow_run(item["run_id"], delay_seconds=delay_seconds)
        else:
            workflow.start_queue_worker()
    except Exception as exc:
        logger.warning("Workflow recovery skipped: %s", exc)

    start_scheduler()


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Run startup tasks in a thread to avoid blocking the async event loop."""
    import asyncio
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, run_startup_tasks)
    yield




def seed_app_settings() -> None:
    """Initialize AppSettings with default values for LLM routing, integration and default metrics."""
    db = SessionLocal()
    try:
        # Default LLM model selection (can be changed via admin dashboard)
        default_settings = {
            "writer_ai_model": "openrouter-free",  # Cost policy: OpenRouter free-model router only
            "integration_rss_feeds": '["https://news.google.com/rss/search?q=supply+chain+management&hl=en-US&gl=US&ceid=US:en"]',
        }
        
        seeded_count = 0
        for key, value in default_settings.items():
            try:
                existing = db.query(models.AppSetting).filter(models.AppSetting.key == key).first()
                if existing:
                    logger.info(f"AppSetting '{key}' already exists, skipping")
                    continue
                
                setting = models.AppSetting(key=key, value=value)
                db.add(setting)
                db.flush()  # Ensure it's added before next iteration
                seeded_count += 1
                logger.info(f"AppSetting '{key}' created")
            except Exception as inner_exc:
                logger.warning(f"Failed to seed AppSetting '{key}': {inner_exc}")
        
        # Seed default dashboard metrics (moved from request-time seeding)
        try:
            metrics_seeded = 0
            for key, title, value, order in metrics.DEFAULT_METRICS:
                exists = db.query(models.DashboardMetric).filter(models.DashboardMetric.key == key).first()
                if exists:
                    continue
                db.add(models.DashboardMetric(key=key, title=title, value=value, display_order=order))
                metrics_seeded += 1
            if metrics_seeded:
                logger.info(f"Seeded {metrics_seeded} default dashboard metrics")
        except Exception as inner_exc:
            logger.warning("Failed to seed default metrics: %s", inner_exc)
            db.rollback()
        
        db.commit()
        logger.info(f"AppSettings seeded successfully ({seeded_count} new settings)")
    except Exception as exc:
        logger.warning("AppSettings seeding failed: %s", exc)
        db.rollback()
    finally:
        db.close()


def seed_sample_posts() -> None:
    samples = [
        ("supply-chain-risk-radar-2026", "Supply Chain Risk Radar for 2026", "Supply Chain", "How leaders can read early disruption signals before they become expensive failures."),
        ("network-resilience-playbook", "Building a Resilient Supply Network", "Supply Chain", "A practical view of alternate sourcing, supplier visibility, and scenario planning."),
        ("port-congestion-visibility", "Port Congestion Visibility Matters", "Logistics", "Why logistics teams need live exception monitoring across port and carrier workflows."),
        ("last-mile-cost-control", "Last-Mile Cost Control Signals", "Logistics", "How delivery density, route discipline, and service promises shape logistics margins."),
        ("supplier-scorecard-modernization", "Modern Supplier Scorecards", "Procurement", "Moving procurement measurement from price-only reviews to risk, quality, and responsiveness."),
        ("strategic-sourcing-ai-era", "Strategic Sourcing in the AI Era", "Procurement", "How procurement teams can combine market intelligence and negotiation discipline."),
        ("warehouse-flow-excellence", "Warehouse Flow Excellence", "Operations Excellence", "Reducing bottlenecks through layout discipline, labor planning, and inventory accuracy."),
        ("sop-to-control-tower", "From SOPs to Control Towers", "Operations Excellence", "How operating rhythms and dashboards make decisions faster and clearer."),
    ]
    db = SessionLocal()
    try:
        for slug, title, category, excerpt in samples:
            exists = db.query(models.Post).filter(models.Post.slug == slug).first()
            if exists:
                continue
            db.add(
                models.Post(
                    title=title,
                    slug=slug,
                    type="analysis",
                    category=category,
                    excerpt=excerpt,
                    content_html=(
                        f"<p>{excerpt}</p>"
                        "<p>This sample insight is included so the Logixa Flow library is ready for testing. "
                        "Admins can edit or delete it from the dashboard workflow.</p>"
                    ),
                    is_published=True,
                    status="published",
                    published_at=models.utc_now(),
                )
            )
        db.commit()
    finally:
        db.close()


def seed_brain_context() -> None:
    """
    Insert default Soul File entries on first startup.

    These entries tell the AI who is operating Logixa Flow and what the
    system is for.  Admins can update or add entries via the Brain API.
    Existing entries are never overwritten by this seed.
    """
    default_entries = [
        (
            "operator_domain",
            "Supply Chain and Logistics intelligence for Myanmar and ASEAN markets",
            "Primary domain focus of this platform",
        ),
        (
            "operator_language",
            "Burmese (Myanmar) primary, English secondary",
            "Operator language preference",
        ),
        (
            "content_style",
            "Analytical, evidence-based, practical insights for business operators and SME teams",
            "Content writing and response style",
        ),
        (
            "brain_purpose",
            (
                "Accumulate supply chain knowledge from RSS feeds and manual sources, "
                "surface weekly trends, and assist the admin in creating blog content "
                "and answering domain questions without repeating context each session"
            ),
            "Core purpose of the brain layer",
        ),
        (
            "target_audience",
            "Myanmar logistics operators, procurement managers, SME business owners, and supply chain analysts",
            "Primary audience for published content",
        ),
    ]

    db = SessionLocal()
    try:
        seeded = 0
        for key, value, description in default_entries:
            exists = (
                db.query(models.BrainContext)
                .filter(models.BrainContext.context_key == key)
                .first()
            )
            if exists:
                continue
            db.add(
                models.BrainContext(
                    context_key=key,
                    context_value=value,
                    description=description,
                    is_active=True,
                    last_updated_by="system",
                )
            )
            seeded += 1
        if seeded:
            db.commit()
            logger.info("Brain context seeded: %s new entries", seeded)
    except Exception as exc:
        logger.warning("Brain context seeding failed: %s", exc)
        db.rollback()
    finally:
        db.close()


app = FastAPI(
    title="Logixa Flow API",
    description="CMS and engagement API for Logixa Flow.",
    version="1.1.0",
    lifespan=lifespan,
)

if os.getenv("USE_SLOWAPI", "false").lower() == "true":
    try:
        from slowapi import Limiter, _rate_limit_exceeded_handler
        from slowapi.errors import RateLimitExceeded
        from slowapi.middleware import SlowAPIMiddleware
        from slowapi.util import get_remote_address

        limiter = Limiter(
            key_func=get_remote_address,
            default_limits=[f"{os.getenv('RATE_LIMIT_REQUESTS', '60')}/minute"],
        )
        app.state.limiter = limiter

        @app.middleware("http")
        async def slowapi_logging_middleware(request: Request, call_next):
            response = await call_next(request)
            return response

        app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
        app.add_middleware(SlowAPIMiddleware)
        logger.info("SlowAPI rate limiting enabled")
    except Exception as exc:
        logger.warning("SlowAPI unavailable, using custom rate limiter only: %s", exc)

app.middleware("http")(security_headers_middleware)
app.middleware("http")(rate_limit_middleware)
app.middleware("http")(stealth_mode_middleware)

def _get_cors_origins() -> list[str]:
    """Get CORS origins from environment with production safety checks."""
    cors_origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:3001,https://logixaflow.vercel.app,https://logixa-flow.vercel.app",
    )
    is_production = os.getenv("ENVIRONMENT", "development").lower() in {"production", "prod"}
    
    origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
    
    # Production safety: reject wildcard origins when credentials are enabled
    if is_production and "*" in origins:
        logger.error("CRITICAL: Wildcard CORS origin '*' is not allowed in production when credentials are enabled.")
        raise ValueError(
            "CORS_ORIGINS cannot contain '*' in production when allow_credentials=True. "
            "Use specific origins instead."
        )
    
    return origins

origins = _get_cors_origins()

# NOTE: allow_origin_regex removed — it bypassed the explicit allowlist in non-prod
# environments and is a security risk. Use CORS_ORIGINS env var to add origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Keep request telemetry outside CORS and access-control middleware so it observes
# preflight, rejected, successful, and failed HTTP responses consistently.
app.middleware("http")(request_observability_middleware)


uploads_dir = Path(__file__).resolve().parents[1] / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
# NOTE (M2): StaticFiles serves /uploads without authentication. For private files,
# replace this mount with an authenticated route in routers/uploads.py that
# checks the session token before streaming the file.
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(admin.router, prefix="/api", tags=["admin"])
app.include_router(posts.router, prefix="/api", tags=["posts"])
app.include_router(moderation.router, prefix="/api", tags=["moderation"])
app.include_router(contacts.router, prefix="/api", tags=["contacts"])
app.include_router(subscribers.router, prefix="/api", tags=["subscribers"])
app.include_router(metrics.router, prefix="/api", tags=["metrics"])
app.include_router(settings.router, prefix="/api", tags=["settings"])
app.include_router(uploads.router, prefix="/api", tags=["uploads"])
app.include_router(agent.router, prefix="/api", tags=["agent"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])
app.include_router(costs.router, prefix="/api", tags=["costs"])
app.include_router(usage.router, prefix="/api", tags=["usage"])
app.include_router(finance.router, prefix="/api", tags=["finance"])
app.include_router(system.router, prefix="/api", tags=["system"])
app.include_router(integration.router, prefix="/api", tags=["integration"])
app.include_router(rag.router, prefix="/api", tags=["rag"])
app.include_router(knowledge.router, prefix="/api", tags=["knowledge"])
app.include_router(estimator.router, prefix="/api/estimator", tags=["estimator"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(controllers.router, prefix="/api/admin/controllers", tags=["controllers"])
app.include_router(email_templates.router, prefix="/api/admin/email-templates", tags=["email_templates"])
app.include_router(submissions.router, prefix="/api/admin/submissions", tags=["submissions"])
app.include_router(diagnostics.router, prefix="/api", tags=["diagnostics"])
app.include_router(workflow.router)
app.include_router(telegram.router, prefix="/api", tags=["telegram"])
app.include_router(brain.router, prefix="/api/admin/brain", tags=["brain"])


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Logixa Flow API is running"}


@app.get("/health")
def health():
    """Public health check — intentionally minimal to avoid leaking infrastructure details.

    Returns {"status": "ok"} when the database is reachable, {"status": "degraded"} with
    HTTP 503 otherwise. Full diagnostics are available via the authenticated
    /api/admin/diagnostics endpoint.
    """
    from fastapi.responses import JSONResponse
    database_ok = False
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        database_ok = True
    except Exception:
        # Intentionally suppressed — do not leak DB class names or messages
        pass
    if database_ok:
        return {"status": "ok"}
    return JSONResponse(status_code=503, content={"status": "degraded"})
