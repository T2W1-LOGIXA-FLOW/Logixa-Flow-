from __future__ import annotations

import logging
import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from . import models
from .cache import cache_client, rate_limiter
from .config import ai_provider_configured, validate_env
from .database import Base, SessionLocal, engine
from .db_bootstrap import bootstrap_database, database_profile
from .logging_config import setup_logging
from .middleware import rate_limit_middleware, security_headers_middleware, stealth_mode_middleware
from .routers import admin, agent, analytics, auth, chat, contacts, controllers, costs, diagnostics, email_templates, estimator, integration, metrics, moderation, posts, rag, settings, submissions, subscribers, system, uploads
from .scheduler import scheduler_status, start_scheduler

logger = logging.getLogger(__name__)
setup_logging()


def ensure_lightweight_migrations() -> None:
    inspector = inspect(engine)
    if "posts" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("posts")}
        if "image_url" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE posts ADD COLUMN image_url VARCHAR(1000)"))
        if "category" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE posts ADD COLUMN category VARCHAR(80) DEFAULT 'Supply Chain' NOT NULL"))
        if "status" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE posts ADD COLUMN status VARCHAR(40) DEFAULT 'published' NOT NULL"))
    if "ai_memory_brain" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("ai_memory_brain")}
        if "confidence_score" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE ai_memory_brain ADD COLUMN confidence_score FLOAT DEFAULT 0 NOT NULL"))
        if "hallucination_score" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE ai_memory_brain ADD COLUMN hallucination_score FLOAT DEFAULT 0 NOT NULL"))
    if "intelligence_sources" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("intelligence_sources")}
        if "trust_score" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE intelligence_sources ADD COLUMN trust_score FLOAT DEFAULT 0.5 NOT NULL"))
    if "feed_sources" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("feed_sources")}
        if "is_active" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE feed_sources ADD COLUMN is_active BOOLEAN DEFAULT 1 NOT NULL"))
        if "last_scrape_at" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE feed_sources ADD COLUMN last_scrape_at DATETIME"))
        if "last_scrape_status" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE feed_sources ADD COLUMN last_scrape_status VARCHAR(40) DEFAULT 'idle' NOT NULL"))
        if "scrape_count" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE feed_sources ADD COLUMN scrape_count INTEGER DEFAULT 0 NOT NULL"))
    
    # Ensure comments table exists
    if "comments" not in inspector.get_table_names():
        with engine.begin() as connection:
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS comments (
                    id INTEGER PRIMARY KEY,
                    text TEXT NOT NULL,
                    post_id INTEGER NOT NULL,
                    parent_id INTEGER,
                    user_id INTEGER NOT NULL,
                    toxicity_score FLOAT DEFAULT 0.0,
                    status VARCHAR(20) DEFAULT 'pending',
                    likes INTEGER DEFAULT 0,
                    dislikes INTEGER DEFAULT 0,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(post_id) REFERENCES posts(id),
                    FOREIGN KEY(parent_id) REFERENCES comments(id)
                )
            """))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_comments_post_id ON comments (post_id)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_comments_status ON comments (status)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_comments_parent_id ON comments (parent_id)"))



# Guard bootstrap with environment variable
if os.getenv("SKIP_DATABASE_BOOTSTRAP", "false").lower() != "true":
    bootstrap_database()
    ensure_lightweight_migrations()
else:
    logger.info("Skipping database bootstrap (SKIP_DATABASE_BOOTSTRAP=true)")

try:
    with SessionLocal() as db:
        from .rag.pgvector_store import ensure_pgvector_schema

        pgvector_status = ensure_pgvector_schema(db)
        if pgvector_status.get("enabled"):
            logger.info("pgvector ready for RAG similarity search")
        elif database_profile() in {"neon", "supabase", "postgres"}:
            logger.warning("pgvector not fully enabled: %s", pgvector_status.get("reason"))
except Exception as exc:
    logger.warning("pgvector startup check skipped: %s", exc)


def seed_app_settings() -> None:
    """Initialize AppSettings with default values for LLM routing and integration."""
    db = SessionLocal()
    try:
        # Default LLM model selection (can be changed via admin dashboard)
        default_settings = {
            "writer_ai_model": "gemini",  # Options: gemini, groq, openrouter-llama, openrouter-deepseek, local
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


# Guard seeding with environment variable
if os.getenv("SKIP_SEEDING", "false").lower() != "true":
    seed_app_settings()
    seed_sample_posts()
else:
    logger.info("Skipping seeding (SKIP_SEEDING=true)")

# Scheduler is already guarded by ENABLE_SCHEDULER env var in start_scheduler()
start_scheduler()

app = FastAPI(
    title="Logixa Flow API",
    description="CMS and engagement API for Logixa Flow.",
    version="1.1.0",
)

if os.getenv("USE_SLOWAPI", "true").lower() == "true":
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

uploads_dir = Path(__file__).resolve().parents[1] / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
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
app.include_router(system.router, prefix="/api", tags=["system"])
app.include_router(integration.router, prefix="/api", tags=["integration"])
app.include_router(rag.router, prefix="/api", tags=["rag"])
app.include_router(estimator.router, prefix="/api/estimator", tags=["estimator"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(controllers.router, prefix="/api/admin/controllers", tags=["controllers"])
app.include_router(email_templates.router, prefix="/api/admin/email-templates", tags=["email_templates"])
app.include_router(submissions.router, prefix="/api/admin/submissions", tags=["submissions"])
app.include_router(diagnostics.router, prefix="/api", tags=["diagnostics"])


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Logixa Flow API is running"}


@app.get("/health")
def health() -> dict[str, object]:
    missing_env = validate_env()
    database_status = "unknown"
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        database_status = "ok"
    except Exception as exc:
        database_status = f"error: {exc.__class__.__name__}"
    embedding_count = 0
    pgvector_status: dict[str, object] = {"enabled": False, "reason": "not_checked"}
    try:
        with SessionLocal() as db:
            embedding_count = db.query(models.DocumentEmbedding).count()
            from .rag.pgvector_store import pgvector_enabled

            enabled = pgvector_enabled(db)
            pgvector_status = {
                "enabled": enabled,
                "reason": "ok" if enabled else "fallback_json_scan",
            }
    except Exception:
        embedding_count = 0
    sched = scheduler_status()
    return {
        "status": "ok" if database_status == "ok" else "degraded",
        "missing_env": missing_env,
        "database": database_status,
        "database_profile": database_profile(),
        "scheduler_enabled": sched["enabled"],
        "scheduler_interval_hours": sched["interval_hours"],
        "ai_key_configured": ai_provider_configured(),
        "embedding_model": os.getenv("EMBEDDING_MODEL", "models/text-embedding-004"),
        "pgvector_enabled": pgvector_status.get("enabled", False),
        "pgvector_reason": pgvector_status.get("reason"),
        "rag_chunks": embedding_count,
        "cache_backend": cache_client.backend,
        "rate_limit_backend": rate_limiter.backend,
        "use_slowapi": os.getenv("USE_SLOWAPI", "true").lower() == "true",
        "integration_feeds": len([item for item in os.getenv("INTEGRATION_RSS_FEEDS", "").split(",") if item.strip()]) or 3,
    }
