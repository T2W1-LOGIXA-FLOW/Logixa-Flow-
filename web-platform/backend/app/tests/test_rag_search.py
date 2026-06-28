import pytest
from sqlalchemy.orm import Session

from app import models
from app.rag.ingest import ingest_intelligence_source
from app.rag.pgvector_store import pgvector_enabled, pgvector_column_exists
from app.rag.search import similarity_search, build_rag_context


@pytest.fixture
def db():
    from app.database import SessionLocal, Base, engine

    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


def test_pgvector_disabled_on_sqlite(db: Session):
    assert pgvector_column_exists(db) is False
    assert pgvector_enabled(db) is False


def test_similarity_search_sqlite_fallback(db: Session):
    source = models.IntelligenceSource(
        title="Port congestion watch",
        url="https://example.com/port",
        source_type="url",
        category="Logistics",
        trust_level="standard",
        notes="Congestion rising at major ASEAN ports.",
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    chunks = ingest_intelligence_source(db, source)
    assert chunks >= 1

    matches = similarity_search(db, "port congestion logistics", top_k=3)
    assert matches
    assert matches[0]["source_type"] == "intelligence_source"
    assert matches[0]["source_id"] == str(source.id)
    assert "score" in matches[0]


def test_build_rag_context_returns_grounded_text(db: Session):
    source = models.IntelligenceSource(
        title="Supplier risk memo",
        source_type="manual",
        category="Supply Chain",
        trust_level="standard",
        notes="Supplier lead times are stretching across Q3.",
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    ingest_intelligence_source(db, source)

    context = build_rag_context(db, "supplier lead time risk")
    assert "Retrieved grounded context" in context
    assert "supplier" in context.lower()
