from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import require_admin

router = APIRouter()


@router.get("", response_model=list[schemas.ContentSubmissionOut])
def get_submissions(
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Get all content submissions.
    """
    query = db.query(models.ContentSubmission)
    if status_filter and status_filter != "all":
        query = query.filter(models.ContentSubmission.status == status_filter)
    return query.order_by(models.ContentSubmission.created_at.desc()).all()


@router.get("/{submission_id}", response_model=schemas.ContentSubmissionOut)
def get_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Get a specific content submission by ID.
    """
    submission = db.query(models.ContentSubmission).filter(models.ContentSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return submission


@router.post("", response_model=schemas.ContentSubmissionOut, status_code=status.HTTP_201_CREATED)
def create_submission(
    submission: schemas.ContentSubmissionCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new content submission (public endpoint, no auth required).
    """
    # Check if submission ID already exists
    existing = db.query(models.ContentSubmission).filter(models.ContentSubmission.id == submission.id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Submission ID already exists")
    
    db_submission = models.ContentSubmission(
        id=submission.id,
        name=submission.name,
        email=submission.email,
        phone=submission.phone,
        subject=submission.subject,
        message=submission.message,
        status=submission.status,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    return db_submission


@router.patch("/{submission_id}", response_model=schemas.ContentSubmissionOut)
def update_submission(
    submission_id: str,
    update: schemas.ContentSubmissionUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Update a content submission (partial update).
    """
    submission = db.query(models.ContentSubmission).filter(models.ContentSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    
    if update.name is not None:
        submission.name = update.name
    if update.email is not None:
        submission.email = update.email
    if update.phone is not None:
        submission.phone = update.phone
    if update.subject is not None:
        submission.subject = update.subject
    if update.message is not None:
        submission.message = update.message
    if update.status is not None:
        submission.status = update.status
    if update.read_at is not None:
        submission.read_at = update.read_at
    
    submission.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(submission)
    return submission


@router.delete("/{submission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Delete a content submission.
    """
    submission = db.query(models.ContentSubmission).filter(models.ContentSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    
    db.delete(submission)
    db.commit()
    return None


@router.post("/{submission_id}/mark-read")
def mark_submission_as_read(
    submission_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Mark a submission as read.
    """
    submission = db.query(models.ContentSubmission).filter(models.ContentSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    
    submission.read_at = datetime.now(timezone.utc)
    submission.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(submission)
    
    return {"message": "Submission marked as read"}