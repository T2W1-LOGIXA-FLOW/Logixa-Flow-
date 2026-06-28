from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter()


@router.post("/subscribers", response_model=schemas.SubscriberOut, status_code=status.HTTP_201_CREATED)
def subscribe(subscriber: schemas.SubscriberCreate, db: Session = Depends(get_db)) -> models.Subscriber:
    existing = db.query(models.Subscriber).filter(models.Subscriber.email == subscriber.email).first()
    if existing:
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        return existing
    db_subscriber = models.Subscriber(email=subscriber.email)
    db.add(db_subscriber)
    db.commit()
    db.refresh(db_subscriber)
    return db_subscriber
