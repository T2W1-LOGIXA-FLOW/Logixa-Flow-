import hashlib
import json
import logging
import os
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import require_admin
from ..llm.router import LLMRouter

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024
MAX_IMPORT_ROWS = 5000



def _dsr_subject_hash(subject_email: str) -> str:
    return hashlib.sha256(subject_email.strip().lower().encode("utf-8")).hexdigest()


def _iso(value):
    return value.isoformat() if hasattr(value, "isoformat") and value is not None else value


def _audit_dsr_event(
    db: Session,
    *,
    actor_id: str,
    action: str,
    subject_hash: str,
    details: dict,
) -> None:
    db.add(
        models.AuditEvent(
            actor_id=actor_id,
            action=action,
            subject_hash=subject_hash,
            details=json.dumps(details, ensure_ascii=True),
            created_at=models.utc_now(),
        )
    )


@router.get("/admin/data-export")
def admin_data_export(
    subject_email: str,
    subject_id: str | None = None,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
) -> dict:
    """Export known application data associated with a data subject."""
    normalized_email = subject_email.strip().lower()
    subject_hash = _dsr_subject_hash(normalized_email)
    actor_id = str(admin.get("sub") or "unknown")

    contacts = db.query(models.Contact).filter(models.Contact.email == normalized_email).all()
    subscribers = db.query(models.Subscriber).filter(models.Subscriber.email == normalized_email).all()
    submissions = (
        db.query(models.ContentSubmission)
        .filter(models.ContentSubmission.email == normalized_email)
        .all()
    )

    session_query = db.query(models.ChatSession).filter(
        (models.ChatSession.user_email == normalized_email)
        | (models.ChatSession.owner_id == subject_id if subject_id else False)
    )
    sessions = session_query.all()
    session_ids = [session.id for session in sessions]
    messages = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id.in_(session_ids))
        .all()
        if session_ids
        else []
    )

    comments = []
    if subject_id and subject_id.isdigit():
        comments = (
            db.query(models.Comment)
            .filter(models.Comment.user_id == int(subject_id))
            .all()
        )

    data = {
        "subject": {"email": normalized_email, "subject_id": subject_id},
        "contacts": [
            {
                "id": row.id,
                "name": row.name,
                "email": row.email,
                "company": row.company,
                "message": row.message,
                "created_at": _iso(row.created_at),
            }
            for row in contacts
        ],
        "subscribers": [
            {
                "id": row.id,
                "email": row.email,
                "is_active": row.is_active,
                "created_at": _iso(row.created_at),
            }
            for row in subscribers
        ],
        "content_submissions": [
            {
                "id": row.id,
                "name": row.name,
                "email": row.email,
                "phone": row.phone,
                "subject": row.subject,
                "message": row.message,
                "status": row.status,
                "read_at": _iso(row.read_at),
                "created_at": _iso(row.created_at),
                "updated_at": _iso(row.updated_at),
            }
            for row in submissions
        ],
        "chat_sessions": [
            {
                "id": row.id,
                "session_id": row.session_id,
                "owner_id": row.owner_id,
                "user_email": row.user_email,
                "title": row.title,
                "agent_id": row.agent_id,
                "context": row.context,
                "is_active": row.is_active,
                "created_at": _iso(row.created_at),
                "updated_at": _iso(row.updated_at),
            }
            for row in sessions
        ],
        "chat_messages": [
            {
                "id": row.id,
                "session_id": row.session_id,
                "role": row.role,
                "content": row.content,
                "agent_id": row.agent_id,
                "model_used": row.model_used,
                "tokens_used": row.tokens_used,
                "cost_estimate": str(row.cost_estimate) if row.cost_estimate is not None else None,
                "created_at": _iso(row.created_at),
            }
            for row in messages
        ],
        "comments": [
            {
                "id": row.id,
                "post_id": row.post_id,
                "text": row.text,
                "status": row.status,
                "created_at": _iso(row.created_at),
            }
            for row in comments
        ],
    }

    counts = {key: len(value) for key, value in data.items() if isinstance(value, list)}
    _audit_dsr_event(
        db,
        actor_id=actor_id,
        action="data_export",
        subject_hash=subject_hash,
        details={"counts": counts},
    )
    db.commit()
    return {"exported_at": _iso(models.utc_now()), "data": data}


@router.post("/admin/data-delete")
def admin_data_delete(
    request: schemas.DataDeletionRequest,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
) -> dict:
    """Permanently delete known application data for a confirmed data subject."""
    normalized_email = request.subject_email.strip().lower()
    expected_confirmation = f"DELETE {normalized_email}"
    if request.confirmation.strip() != expected_confirmation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deletion confirmation does not match the requested subject",
        )

    subject_hash = _dsr_subject_hash(normalized_email)
    actor_id = str(admin.get("sub") or "unknown")

    contacts = db.query(models.Contact).filter(models.Contact.email == normalized_email).all()
    subscribers = db.query(models.Subscriber).filter(models.Subscriber.email == normalized_email).all()
    submissions = (
        db.query(models.ContentSubmission)
        .filter(models.ContentSubmission.email == normalized_email)
        .all()
    )
    sessions = db.query(models.ChatSession).filter(
        models.ChatSession.user_email == normalized_email
    ).all()

    session_ids = [row.id for row in sessions]
    deleted_messages = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id.in_(session_ids))
        .delete(synchronize_session=False)
        if session_ids
        else 0
    )
    deleted_sessions = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.id.in_(session_ids))
        .delete(synchronize_session=False)
        if session_ids
        else 0
    )
    deleted_comments = 0

    for collection in (contacts, subscribers, submissions):
        for row in collection:
            db.delete(row)

    if request.confirmation.startswith("DELETE ") and request.subject_email:
        # Legacy comment ownership is numeric; email-only DSRs cannot safely infer it.
        # A separate subject-id field can be added when legacy identity mapping exists.
        deleted_comments = 0

    counts = {
        "contacts": len(contacts),
        "subscribers": len(subscribers),
        "content_submissions": len(submissions),
        "chat_messages": int(deleted_messages or 0),
        "chat_sessions": int(deleted_sessions or 0),
        "comments": deleted_comments,
    }
    _audit_dsr_event(
        db,
        actor_id=actor_id,
        action="data_delete",
        subject_hash=subject_hash,
        details={"counts": counts},
    )
    db.commit()

    return {"deleted": counts, "subject": {"email": normalized_email}}


@router.post("/admin/newsletter/send", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def send_newsletter(
    request: schemas.NewsletterSendRequest,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
) -> dict:
    """Reject newsletter sends until a real transactional email provider is connected."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Newsletter delivery is not configured; no messages were queued or sent.",
    )


@router.get("/admin/system/ai-status")
def ai_provider_status(db: Session = Depends(get_db), _=Depends(require_admin)):
    router = LLMRouter(db)
    status = {}
    for name, provider in router.providers.items():
        status[name] = provider.is_available()
    return {"providers": status}


@router.post("/admin/imports")
def admin_bulk_import(file: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(require_admin)):
    """Import CSV, XLSX, or PDF files into ai_memory_brain and create draft posts.

    Expected CSV columns (optional): title, content, category
    XLSX should have same columns in the first sheet.
    PDFs will be converted to a single content record using extracted text.
    """
    import csv
    import io
    from sqlalchemy.exc import SQLAlchemyError

    # Try optional dependencies
    try:
        import pypdf
    except Exception:
        pypdf = None
    try:
        import openpyxl
    except Exception:
        openpyxl = None

    def slugify(s: str) -> str:
        import re
        slug = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
        # ensure uniqueness is handled by DB unique constraint on posts.slug if present
        return slug or f"import-{uuid4().hex[:8]}"

    created_post_ids: list[int] = []

    filename = (file.filename or "uploaded").lower()
    content_items: list[dict] = []

    # Read file content
    data = file.file.read(MAX_IMPORT_FILE_BYTES + 1)
    if len(data) > MAX_IMPORT_FILE_BYTES:
        raise HTTPException(status_code=413, detail=f"Import file exceeds the {MAX_IMPORT_FILE_BYTES // (1024 * 1024)} MB limit")
    if filename.endswith(".pdf") or file.content_type == "application/pdf":
        if pypdf is None:
            raise HTTPException(status_code=500, detail="PDF support is not installed on the backend")
        reader = pypdf.PdfReader(io.BytesIO(data))
        pages = []
        for p in reader.pages:
            try:
                pages.append(p.extract_text() or "")
            except Exception:
                continue
        text = "\n\n".join(pages).strip()
        if text:
            content_items.append({"title": filename, "content": text, "category": "Supply Chain"})
    elif filename.endswith(".csv") or file.content_type in {"text/csv", "application/csv"}:
        stream = io.StringIO(data.decode("utf-8", errors="replace"))
        reader = csv.DictReader(stream)
        for row in reader:
            if len(content_items) >= MAX_IMPORT_ROWS:
                raise HTTPException(status_code=413, detail=f"Import exceeds the {MAX_IMPORT_ROWS} row limit")
            content_items.append({
                "title": row.get("title") or row.get("source_title") or filename,
                "content": row.get("content") or row.get("summary") or ", ".join((row.values() or [])),
                "category": row.get("category") or "Supply Chain",
            })
    elif filename.endswith(".xlsx") or file.content_type in {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}:
        if openpyxl is None:
            raise HTTPException(status_code=500, detail="XLSX support is not installed on the backend")
        wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True)
        ws = wb.active
        headers = [str(cell.value).strip().lower() if cell.value else "" for cell in next(ws.rows)]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if len(content_items) >= MAX_IMPORT_ROWS:
                raise HTTPException(status_code=413, detail=f"Import exceeds the {MAX_IMPORT_ROWS} row limit")
            row_map = {headers[i]: (row[i] or "") for i in range(min(len(headers), len(row)))}
            content_items.append({
                "title": row_map.get("title") or filename,
                "content": row_map.get("content") or " ".join(str(v) for v in row if v),
                "category": row_map.get("category") or "Supply Chain",
            })
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Supported: .csv, .xlsx, .pdf")

    if not content_items:
        return {"imported": 0, "created_posts": []}

    try:
        for item in content_items:
            title = (item.get("title") or filename)[:255]
            content = item.get("content") or ""
            category = item.get("category") or "Supply Chain"

            memory = models.AiMemoryBrain(
                category=category,
                source_title=title,
                source_url=None,
                prompt="",
                content=content,
                summary=(content[:200] + "...") if len(content) > 200 else content,
                status="pending",
            )
            db.add(memory)
            db.flush()

            slug = slugify(title)[:255]
            post = models.Post(
                title=title,
                slug=slug,
                type="news",
                category=category,
                excerpt=(content[:200] + "...") if len(content) > 200 else content,
                content_html=f"<p>{content}</p>",
                is_published=False,
                status="draft",
            )
            db.add(post)
            db.flush()

            memory.post_slug = post.slug
            created_post_ids.append(post.id)

        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "Failed to import admin bulk records",
            extra={
                "operation": "admin_bulk_import",
                "row_count": len(content_items),
                "error_type": "database_failure",
            },
        )
        raise HTTPException(status_code=500, detail="Database error during import")
    except Exception:
        db.rollback()
        logger.exception(
            "Failed to import admin bulk records",
            extra={
                "operation": "admin_bulk_import",
                "row_count": len(content_items),
                "error_type": "import_failure",
            },
        )
        raise HTTPException(status_code=500, detail="Database error during import")

    return {"imported": len(created_post_ids), "created_posts": created_post_ids}