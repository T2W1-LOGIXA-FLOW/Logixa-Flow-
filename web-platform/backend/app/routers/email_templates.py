from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import require_admin

router = APIRouter()


@router.get("", response_model=list[schemas.EmailTemplateOut])
def get_email_templates(
    active_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Get all email templates.
    """
    query = db.query(models.EmailTemplate)
    if active_only:
        query = query.filter(models.EmailTemplate.is_active == True)
    return query.order_by(models.EmailTemplate.name).all()


@router.get("/{template_id}", response_model=schemas.EmailTemplateOut)
def get_email_template(
    template_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Get a specific email template by ID.
    """
    template = db.query(models.EmailTemplate).filter(models.EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email template not found")
    return template


@router.post("", response_model=schemas.EmailTemplateOut, status_code=status.HTTP_201_CREATED)
def create_email_template(
    template: schemas.EmailTemplateCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Create a new email template.
    """
    # Check if template ID already exists
    existing = db.query(models.EmailTemplate).filter(models.EmailTemplate.id == template.id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Template ID already exists")
    
    db_template = models.EmailTemplate(
        id=template.id,
        name=template.name,
        subject=template.subject,
        template_html=template.template_html,
        is_active=template.is_active,
        description=template.description,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.patch("/{template_id}", response_model=schemas.EmailTemplateOut)
def update_email_template(
    template_id: str,
    update: schemas.EmailTemplateUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Update an email template (partial update).
    """
    template = db.query(models.EmailTemplate).filter(models.EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email template not found")
    
    if update.name is not None:
        template.name = update.name
    if update.subject is not None:
        template.subject = update.subject
    if update.template_html is not None:
        template.template_html = update.template_html
    if update.is_active is not None:
        template.is_active = update.is_active
    if update.description is not None:
        template.description = update.description
    
    template.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_email_template(
    template_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Delete an email template.
    """
    template = db.query(models.EmailTemplate).filter(models.EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email template not found")
    
    db.delete(template)
    db.commit()
    return None


@router.post("/{template_id}/send-test")
def send_test_email(
    template_id: str,
    recipient_email: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Send a test email using the specified template.
    Beta fallback: production email delivery is not connected here yet.
    """
    template = db.query(models.EmailTemplate).filter(models.EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email template not found")
    
    if not template.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Template is not active")
    
    return {
        "success": True,
        "beta_mode": True,
        "message": f"Beta preview only. No email was sent to {recipient_email}. Template: '{template.name}'",
        "template_id": template_id,
        "recipient": recipient_email
    }
