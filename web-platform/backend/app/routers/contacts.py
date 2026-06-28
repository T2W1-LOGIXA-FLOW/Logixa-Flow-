from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter()


@router.post("/contacts", response_model=schemas.ContactOut, status_code=status.HTTP_201_CREATED)
def submit_contact(contact: schemas.ContactCreate, db: Session = Depends(get_db)) -> models.Contact:
    db_contact = models.Contact(**contact.model_dump())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact
