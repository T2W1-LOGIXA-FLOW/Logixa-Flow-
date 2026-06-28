from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import require_admin

router = APIRouter()
AI_MODEL_KEY = "writer_ai_model"


def get_setting(db: Session, key: str, default: str) -> str:
    setting = db.query(models.AppSetting).filter(models.AppSetting.key == key).first()
    if not setting:
        setting = models.AppSetting(key=key, value=default)
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting.value


@router.get("/settings/ai", response_model=schemas.AISettingOut)
def get_ai_setting(db: Session = Depends(get_db)):
    return schemas.AISettingOut(selected_model=get_setting(db, AI_MODEL_KEY, "gemini"))


@router.patch("/settings/ai", response_model=schemas.AISettingOut)
def update_ai_setting(
    payload: schemas.AISettingUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    setting = db.query(models.AppSetting).filter(models.AppSetting.key == AI_MODEL_KEY).first()
    if not setting:
        setting = models.AppSetting(key=AI_MODEL_KEY, value=payload.selected_model)
        db.add(setting)
    else:
        setting.value = payload.selected_model
    db.commit()
    return schemas.AISettingOut(selected_model=payload.selected_model)
