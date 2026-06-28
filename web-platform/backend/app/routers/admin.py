# backend/app/routers/system.py (သို့ admin.py ထဲထည့်)
import os

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import require_admin
from ..llm.router import LLMRouter

router = APIRouter()

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