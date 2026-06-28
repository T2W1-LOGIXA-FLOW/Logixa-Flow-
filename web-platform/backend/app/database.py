from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DEFAULT_SQLITE = f"sqlite:///{Path(__file__).resolve().parents[1] / 'logixa_flow.db'}"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

if DATABASE_URL.startswith("postgresql"):
    try:
        from sqlalchemy import event

        @event.listens_for(engine, "connect")
        def _register_pgvector(dbapi_connection, _connection_record) -> None:
            try:
                from pgvector.psycopg2 import register_vector

                register_vector(dbapi_connection)
            except Exception:
                pass
    except Exception:
        pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
