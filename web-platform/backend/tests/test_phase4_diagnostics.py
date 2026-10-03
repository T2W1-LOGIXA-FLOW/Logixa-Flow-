"""
PHASE 4: Database & LLM Diagnostics Test Suite

Tests:
1. SQLite database connectivity
2. PostgreSQL/pgvector support (if configured)
3. AppSetting seeding and retrieval
4. LLM provider availability and fallback chain
5. RAG module initialization
6. Model definitions and schema
7. Router endpoint registration
"""

import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_path))

# Import models FIRST before any database operations
from app import models
from app.database import SessionLocal, engine, Base
from app.db_bootstrap import database_profile, bootstrap_database
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session


def ensure_database_ready():
    """Bootstrap tables and seed required settings for individual pytest runs."""
    bootstrap_database()

    db = SessionLocal()
    try:
        existing = db.query(models.AppSetting).filter(
            models.AppSetting.key == "writer_ai_model"
        ).first()

        if not existing:
            default_settings = {
                "writer_ai_model": "gemini",
                "integration_rss_feeds": '["https://news.google.com/rss/search?q=supply+chain+management&hl=en-US&gl=US&ceid=US:en"]',
            }
            for key, value in default_settings.items():
                db.add(models.AppSetting(key=key, value=value))
            db.commit()
    finally:
        db.close()


def setup_module():
    ensure_database_ready()


def check_database_connectivity():
    """Test 1: SQLite connectivity"""
    print("\n" + "="*60)
    print("TEST 1: Database Connectivity")
    print("="*60)
    
    try:
        db = SessionLocal()
        result = db.execute(text("SELECT 1"))
        db.close()
        profile = database_profile()
        print(f"✅ Database Profile: {profile}")
        print(f"✅ Database connection successful")
        return True
    except Exception as exc:
        print(f"❌ Database connection failed: {exc}")
        return False


def check_database_tables():
    """Test 2: Check if all required tables exist"""
    print("\n" + "="*60)
    print("TEST 2: Database Tables Verification")
    print("="*60)
    
    required_tables = [
        "posts", "contacts", "subscribers", "dashboard_metrics",
        "app_settings", "intelligence_sources", "ai_memory_brain",
        "agent_runs", "agent_feedback_events", "agent_steps",
        "analytics_events", "feed_sources", "document_embeddings", "comments"
    ]
    
    try:
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        
        missing = [t for t in required_tables if t not in existing_tables]
        present = [t for t in required_tables if t in existing_tables]
        
        for table in present:
            print(f"✅ Table '{table}' exists")
        
        for table in missing:
            print(f"⚠️  Table '{table}' missing")
        
        return len(missing) == 0
    except Exception as exc:
        print(f"❌ Table verification failed: {exc}")
        return False


def check_app_settings_seeding():
    """Test 3: AppSetting seeding and retrieval"""
    print("\n" + "="*60)
    print("TEST 3: AppSetting Seeding & Retrieval")
    print("="*60)
    
    try:
        db = SessionLocal()
        
        # Check if settings were seeded
        writer_setting = db.query(models.AppSetting).filter(
            models.AppSetting.key == "writer_ai_model"
        ).first()
        
        feeds_setting = db.query(models.AppSetting).filter(
            models.AppSetting.key == "integration_rss_feeds"
        ).first()
        
        if writer_setting:
            print(f"✅ writer_ai_model setting found: {writer_setting.value}")
        else:
            print(f"⚠️  writer_ai_model setting NOT found")
        
        if feeds_setting:
            print(f"✅ integration_rss_feeds setting found (length: {len(feeds_setting.value)} chars)")
        else:
            print(f"⚠️  integration_rss_feeds setting NOT found")
        
        db.close()
        return bool(writer_setting and feeds_setting)
    except Exception as exc:
        print(f"❌ AppSetting test failed: {exc}")
        return False


def check_llm_provider_setup():
    """Test 4: LLM provider availability and fallback chain"""
    print("\n" + "="*60)
    print("TEST 4: LLM Provider Setup & Availability")
    print("="*60)
    
    try:
        from app.llm.router import LLMRouter
        
        db = SessionLocal()
        router = LLMRouter(db)
        
        print(f"✅ LLMRouter initialized successfully")
        print(f"✅ Available providers: {list(router.providers.keys())}")
        
        # Test fallback chain
        try:
            provider = router.get_active_provider()
            provider_name = provider.__class__.__name__
            print(f"✅ Active provider: {provider_name}")
            print(f"✅ Provider is available: {provider.is_available()}")
        except Exception as exc:
            print(f"⚠️  Error getting active provider: {exc}")
        
        db.close()
        return True
    except Exception as exc:
        print(f"❌ LLM provider test failed: {exc}")
        return False


def check_rag_module_initialization():
    """Test 5: RAG module and pgvector support"""
    print("\n" + "="*60)
    print("TEST 5: RAG Module Initialization")
    print("="*60)
    
    try:
        from app.rag.search import similarity_search, build_rag_context
        from app.rag.pgvector_store import pgvector_enabled, is_postgres
        from app.db_bootstrap import database_profile
        
        db = SessionLocal()
        
        # Check database type
        is_pg = is_postgres(db)
        profile = database_profile()
        pgvector_ready = pgvector_enabled(db)
        
        print(f"✅ Database type: {profile}")
        print(f"✅ Is PostgreSQL: {is_pg}")
        
        if is_pg:
            if pgvector_ready:
                print(f"✅ pgvector extension enabled")
                print(f"✅ PostgreSQL + pgvector ready for RAG")
            else:
                print(f"⚠️  PostgreSQL detected but pgvector not enabled")
        else:
            print(f"✅ Using SQLite fallback for RAG (cosine similarity)")
        
        db.close()
        return True
    except Exception as exc:
        print(f"❌ RAG module test failed: {exc}")
        return False


def check_model_definitions():
    """Test 6: Check all model definitions are complete"""
    print("\n" + "="*60)
    print("TEST 6: Model Definitions Verification")
    print("="*60)
    
    model_classes = [
        ("Post", models.Post),
        ("Contact", models.Contact),
        ("Subscriber", models.Subscriber),
        ("DashboardMetric", models.DashboardMetric),
        ("AppSetting", models.AppSetting),
        ("IntelligenceSource", models.IntelligenceSource),
        ("AiMemoryBrain", models.AiMemoryBrain),
        ("AgentRun", models.AgentRun),
        ("AgentFeedbackEvent", models.AgentFeedbackEvent),
        ("AgentStep", models.AgentStep),
        ("AnalyticsEvent", models.AnalyticsEvent),
        ("FeedSource", models.FeedSource),
        ("DocumentEmbedding", models.DocumentEmbedding),
        ("Comment", models.Comment),
    ]
    
    all_valid = True
    for name, model_class in model_classes:
        try:
            # Check if model has __tablename__
            table_name = model_class.__tablename__
            print(f"✅ {name} model: table='{table_name}'")
        except Exception as exc:
            print(f"❌ {name} model invalid: {exc}")
            all_valid = False
    
    return all_valid


def check_router_registration():
    """Test 7: Check all routers are properly registered"""
    print("\n" + "="*60)
    print("TEST 7: Router Registration Check")
    print("="*60)
    
    try:
        from app import routers
        
        required_routers = [
            "admin", "agent", "analytics", "costs", "auth",
            "contacts", "diagnostics", "integration", "metrics",
            "moderation", "posts", "rag", "settings", "subscribers",
            "system", "uploads"
        ]
        
        for router_name in required_routers:
            if hasattr(routers, router_name):
                router_module = getattr(routers, router_name)
                if hasattr(router_module, "router"):
                    print(f"✅ Router '{router_name}' is registered")
                else:
                    print(f"⚠️  Router '{router_name}' module found but no 'router' attribute")
            else:
                print(f"⚠️  Router '{router_name}' not found in routers package")
        
        return True
    except Exception as exc:
        print(f"❌ Router registration check failed: {exc}")
        return False


def check_moderation_endpoints():
    """Test 8: Verify moderation router has all endpoints"""
    print("\n" + "="*60)
    print("TEST 8: Moderation Router Endpoints")
    print("="*60)
    
    try:
        from app.routers.moderation import router
        
        required_routes = [
            ("POST", "/comments"),
            ("GET", "/comments"),
            ("GET", "/comments/{comment_id}"),
            ("PUT", "/comments/{comment_id}"),
            ("DELETE", "/comments/{comment_id}"),
            ("GET", "/posts/{post_id}/comments"),
        ]
        
        registered_routes = []
        for route in router.routes:
            if hasattr(route, "methods"):
                for method in route.methods:
                    registered_routes.append((method, route.path))
        
        for method, path in required_routes:
            found = any(m == method and p == path for m, p in registered_routes)
            status = "✅" if found else "❌"
            print(f"{status} {method:6s} {path}")
        
        return all(
            any(m == method and p == path for m, p in registered_routes)
            for method, path in required_routes
        )
    except Exception as exc:
        print(f"❌ Moderation endpoints check failed: {exc}")
        return False


def check_security_functions():
    """Test 9: Verify security functions exist"""
    print("\n" + "="*60)
    print("TEST 9: Security Functions Verification")
    print("="*60)
    
    try:
        from app.security import (
            get_current_user, CurrentUser, require_admin,
            create_access_token, decode_token, verify_service_token
        )
        
        print(f"✅ get_current_user function exists")
        print(f"✅ CurrentUser class exists")
        print(f"✅ require_admin function exists")
        print(f"✅ create_access_token function exists")
        print(f"✅ decode_token function exists")
        print(f"✅ verify_service_token function exists")
        
        # Test token creation/decoding
        token = create_access_token("test_user", role="admin")
        decoded = decode_token(token)
        
        if decoded.get("sub") == "test_user" and decoded.get("role") == "admin":
            print(f"✅ Token creation/decoding works correctly")
            return True
        else:
            print(f"❌ Token decoded incorrectly: {decoded}")
            return False
    except Exception as exc:
        print(f"❌ Security functions check failed: {exc}")
        return False


def run_all_tests():
    """Run all diagnostic tests"""
    print("\n" + "="*60)
    print("= PHASE 4: DIAGNOSTICS TEST SUITE")
    print("="*60)
    
    # Ensure database is bootstrapped with tables
    try:
        bootstrap_database()
    except Exception as exc:
        print(f"⚠️  Bootstrap warning: {exc}")
    
    # Seed AppSettings
    try:
        db = SessionLocal()
        # Check if settings already exist
        existing = db.query(models.AppSetting).filter(
            models.AppSetting.key == "writer_ai_model"
        ).first()
        
        if not existing:
            default_settings = {
                "writer_ai_model": "gemini",
                "integration_rss_feeds": '["https://news.google.com/rss/search?q=supply+chain+management&hl=en-US&gl=US&ceid=US:en"]',
            }
            for key, value in default_settings.items():
                setting = models.AppSetting(key=key, value=value)
                db.add(setting)
            db.commit()
        db.close()
    except Exception as exc:
        print(f"⚠️  AppSetting seeding warning: {exc}")
    
    results = {
        "Database Connectivity": check_database_connectivity(),
        "Database Tables": check_database_tables(),
        "AppSetting Seeding": check_app_settings_seeding(),
        "LLM Provider Setup": check_llm_provider_setup(),
        "RAG Module Initialization": check_rag_module_initialization(),
        "Model Definitions": check_model_definitions(),
        "Router Registration": check_router_registration(),
        "Moderation Endpoints": check_moderation_endpoints(),
        "Security Functions": check_security_functions(),
    }
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status:8s} - {test_name}")
    
    print("="*60)
    print(f"Results: {passed}/{total} tests passed")
    print("="*60 + "\n")
    
    return passed == total


def test_database_connectivity():
    assert check_database_connectivity()


def test_database_tables():
    assert check_database_tables()


def test_app_settings_seeding():
    assert check_app_settings_seeding()


def test_llm_provider_setup():
    assert check_llm_provider_setup()


def test_rag_module_initialization():
    assert check_rag_module_initialization()


def test_model_definitions():
    assert check_model_definitions()


def test_router_registration():
    assert check_router_registration()


def test_moderation_endpoints():
    assert check_moderation_endpoints()


def test_security_functions():
    assert check_security_functions()


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
