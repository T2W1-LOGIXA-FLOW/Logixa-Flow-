from __future__ import annotations

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from ..database import Base
from ..rag.observability import fingerprint, record_event


def test_rag_observability_persists_event_and_fingerprint():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE rag_observability_events (id INTEGER PRIMARY KEY, event_type VARCHAR(60) NOT NULL, operation VARCHAR(60) NOT NULL, payload TEXT NOT NULL, fingerprint VARCHAR(128), created_at DATETIME NOT NULL)"))
    Session = sessionmaker(bind=engine)
    with Session() as db:
        record_event(db, "quality_feedback", "rag_search", {"rating": 5}, fingerprint=fingerprint("run", 1))
        db.commit()
        row = db.execute(text("SELECT event_type, operation, payload, fingerprint FROM rag_observability_events")).one()
        assert row[0:2] == ("quality_feedback", "rag_search")
        assert '"rating": 5' in row[2]
        assert len(row[3]) == 64
    engine.dispose()
