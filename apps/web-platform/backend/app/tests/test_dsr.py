from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models, schemas
from app.routers import admin


def test_dsr_export_and_confirmed_delete():
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()

    session = models.ChatSession(
        session_id="dsr-session",
        owner_id="user-dsr",
        user_email="user@example.com",
        title="Private session",
        is_active=True,
        created_at=models.utc_now(),
        updated_at=models.utc_now(),
    )
    db.add_all(
        [
            models.Contact(
                name="User",
                email="user@example.com",
                company="Example",
                message="Contact message",
                created_at=models.utc_now(),
            ),
            models.Subscriber(
                email="user@example.com",
                is_active=True,
                created_at=models.utc_now(),
            ),
            models.ContentSubmission(
                id="dsr-submission",
                name="User",
                email="user@example.com",
                phone="+1 415 555 0199",
                subject="Subject",
                message="Submission message",
                status="pending",
                created_at=models.utc_now(),
                updated_at=models.utc_now(),
            ),
            session,
        ]
    )
    db.commit()
    db.refresh(session)
    db.add(
        models.ChatMessage(
            session_id=session.id,
            role="user",
            content="Private chat message",
            created_at=models.utc_now(),
        )
    )
    db.commit()

    exported = admin.admin_data_export(
        subject_email="user@example.com",
        subject_id="user-dsr",
        db=db,
        admin={"sub": "admin-user"},
    )
    assert len(exported["data"]["contacts"]) == 1
    assert len(exported["data"]["subscribers"]) == 1
    assert len(exported["data"]["content_submissions"]) == 1
    assert len(exported["data"]["chat_sessions"]) == 1
    assert len(exported["data"]["chat_messages"]) == 1

    deletion = admin.admin_data_delete(
        schemas.DataDeletionRequest(
            subject_email="user@example.com",
            confirmation="DELETE user@example.com",
        ),
        db=db,
        admin={"sub": "admin-user"},
    )
    assert deletion["deleted"]["contacts"] == 1
    assert deletion["deleted"]["subscribers"] == 1
    assert deletion["deleted"]["content_submissions"] == 1
    assert deletion["deleted"]["chat_messages"] == 1
    assert deletion["deleted"]["chat_sessions"] == 1

    assert db.query(models.Contact).count() == 0
    assert db.query(models.Subscriber).count() == 0
    assert db.query(models.ContentSubmission).count() == 0
    assert db.query(models.ChatSession).count() == 0
    assert db.query(models.ChatMessage).count() == 0

    audit = db.query(models.AuditEvent).order_by(models.AuditEvent.id).all()
    assert [event.action for event in audit] == ["data_export", "data_delete"]
    assert all("user@example.com" not in event.details for event in audit)
    assert all(len(event.subject_hash) == 64 for event in audit)

    db.close()


def test_dsr_delete_requires_exact_confirmation():
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()

    try:
        try:
            admin.admin_data_delete(
                schemas.DataDeletionRequest(
                    subject_email="user@example.com",
                    confirmation="DELETE",
                ),
                db=db,
                admin={"sub": "admin-user"},
            )
        except Exception as exc:
            assert getattr(exc, "status_code", None) == 400
        else:
            raise AssertionError("Invalid deletion confirmation must be rejected")
    finally:
        db.close()
