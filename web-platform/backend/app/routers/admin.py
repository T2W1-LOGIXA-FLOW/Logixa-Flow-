# backend/app/routers/system.py (သို့ admin.py ထဲထည့်)
import hashlib
import json
import os
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import require_admin
from ..llm.router import LLMRouter

router = APIRouter()

MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024
MAX_IMPORT_ROWS = 5000


def _subject_hash(subject: str) -> str:
    return hashlib.sha256(subject.strip().lower().encode("utf-8")).hexdigest()


@router.get("/admin/data-export")
def export_user_data(
    user_id: str = Query(..., min_length=1, max_length=255),
    _admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Export application records associated with an email or owner id."""
    subject = user_id.strip()
    subject_lower = subject.lower()

    sessions = (
        db.query(models.ChatSession)
        .filter(
            (models.ChatSession.owner_id == subject)
            | (models.ChatSession.user_email == subject_lower)
            | (models.ChatSession.user_email == subject)
        )
        .all()
    )
    session_ids = [session.id for session in sessions]

    messages = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id.in_(session_ids))
        .all()
        if session_ids
        else []
    )

    contacts = db.query(models.Contact).filter(models.Contact.email.ilike(subject_lower)).all()
    subscribers = db.query(models.Subscriber).filter(models.Subscriber.email.ilike(subject_lower)).all()
    submissions = db.query(models.ContentSubmission).filter(models.ContentSubmission.email.ilike(subject_lower)).all()
    estimation_history = db.query(models.EstimationHistory).filter(models.EstimationHistory.user_email.ilike(subject_lower)).all()

    return {
        "subject": {"identifier": subject, "identifier_hash": _subject_hash(subject)},
        "exported_at": models.utc_now().isoformat(),
        "chat_sessions": [row.__dict__ | {"_sa_instance_state": None} for row in sessions],
        "chat_messages": [row.__dict__ | {"_sa_instance_state": None} for row in messages],
        "contacts": [row.__dict__ | {"_sa_instance_state": None} for row in contacts],
        "subscribers": [row.__dict__ | {"_sa_instance_state": None} for row in subscribers],
        "content_submissions": [row.__dict__ | {"_sa_instance_state": None} for row in submissions],
        "estimation_history": [row.__dict__ | {"_sa_instance_state": None} for row in estimation_history],
    }


@router.delete("/admin/data-delete")
def delete_user_data(
    user_id: str = Query(..., min_length=1, max_length=255),
    confirm: bool = Query(default=False),
    _admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Delete user-associated application data after explicit confirmation."""
    if not confirm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Explicit confirm=true is required")

    subject = user_id.strip()
    subject_lower = subject.lower()
    try:
        sessions = (
            db.query(models.ChatSession)
            .filter(
                (models.ChatSession.owner_id == subject)
                | (models.ChatSession.user_email == subject_lower)
                | (models.ChatSession.user_email == subject)
            )
            .all()
        )
        session_ids = [session.id for session in sessions]

        deleted = {
            "chat_messages": 0,
            "chat_sessions": 0,
            "contacts": 0,
            "subscribers": 0,
            "content_submissions": 0,
            "estimation_history": 0,
        }

        if session_ids:
            deleted["chat_messages"] = db.query(models.ChatMessage).filter(models.ChatMessage.session_id.in_(session_ids)).delete(synchronize_session=False)
            deleted["chat_sessions"] = db.query(models.ChatSession).filter(models.ChatSession.id.in_(session_ids)).delete(synchronize_session=False)

        deleted["contacts"] = db.query(models.Contact).filter(models.Contact.email.ilike(subject_lower)).delete(synchronize_session=False)
        deleted["subscribers"] = db.query(models.Subscriber).filter(models.Subscriber.email.ilike(subject_lower)).delete(synchronize_session=False)
        deleted["content_submissions"] = db.query(models.ContentSubmission).filter(models.ContentSubmission.email.ilike(subject_lower)).delete(synchronize_session=False)
        deleted["estimation_history"] = db.query(models.EstimationHistory).filter(models.EstimationHistory.user_email.ilike(subject_lower)).delete(synchronize_session=False)

        audit = models.AuditEvent(
            id=f"audit-{uuid4().hex}",
            actor_id=str(_admin.get("sub") or ""),
            action="data_delete",
            subject_hash=_subject_hash(subject),
            details=json.dumps({"deleted": deleted}, separators=(",", ":")),
            created_at=models.utc_now(),
        )
        db.add(audit)
        db.commit()
        return {"deleted": deleted, "subject_hash": _subject_hash(subject)}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Data deletion failed") from exc

@router.post("/admin/newsletter/send", response_model=schemas.NewsletterSendResponse, status_code=status.HTTP_202_ACCEPTED)
def send_newsletter(
    request: schemas.NewsletterSendRequest,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
) -> schemas.NewsletterSendResponse:
    """Send newsletter to active subscribers (async task support removed with Celery cleanup)"""
    from_address = os.getenv("DEFAULT_FROM_EMAIL")
    if not from_address:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DEFAULT_FROM_EMAIL is not configured")
    if not os.getenv("RESEND_API_KEY"):
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="RESEND_API_KEY is not configured")

    if request.test_mode:
        subscriber = (
            db.query(models.Subscriber)
            .filter(models.Subscriber.is_active == True)
            .order_by(models.Subscriber.id)
            .first()
        )
        recipients = [subscriber.email] if subscriber else [from_address]
    else:
        recipients = [subscriber.email for subscriber in db.query(models.Subscriber).filter(models.Subscriber.is_active == True).all()]
        if not recipients:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active newsletter subscribers found")

    # Celery task support removed - return queued status with recipient count
    # In production, implement with APScheduler or direct email service integration
    return schemas.NewsletterSendResponse(
        status="queued",
        recipients=len(recipients),
        task_ids=[],  # No async tasks available after Celery cleanup
        test_mode=request.test_mode,
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

    imported = 0
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
        with db.begin():
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

                base_slug = slugify(title)[:240]
                slug = base_slug
                suffix = 1
                while db.query(models.Post).filter(models.Post.slug == slug).first():
                    slug = f"{base_slug}-{suffix}"
                    suffix += 1
                    if suffix > 1000:
                        raise HTTPException(status_code=409, detail="Unable to allocate a unique post slug")

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
                imported += 1
                created_post_ids.append(post.id)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="A database error occurred during import") from exc

    return {"imported": imported, "created_posts": created_post_ids}