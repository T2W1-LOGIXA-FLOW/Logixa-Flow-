from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import require_admin

router = APIRouter()
AI_MODEL_KEY = "writer_ai_model"


def get_setting(db: Session, key: str, default: str) -> str:
    """
    Read AppSetting value for `key`. This helper does NOT mutate the database.
    Seeding of default AppSetting rows is performed at startup instead.
    """
    setting = db.query(models.AppSetting).filter(models.AppSetting.key == key).first()
    if setting:
        return setting.value
    return default


@router.get("/settings/ai", response_model=schemas.AISettingOut)
def get_ai_setting(db: Session = Depends(get_db)):
    return schemas.AISettingOut(selected_model="openrouter-free")


@router.patch("/settings/ai", response_model=schemas.AISettingOut)
def update_ai_setting(
    payload: schemas.AISettingUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    if payload.selected_model != "openrouter-free":
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Only the OpenRouter free-model route is enabled by the cost policy.")
    setting = db.query(models.AppSetting).filter(models.AppSetting.key == AI_MODEL_KEY).first()
    if not setting:
        setting = models.AppSetting(key=AI_MODEL_KEY, value="openrouter-free")
        db.add(setting)
    else:
        setting.value = "openrouter-free"
    db.commit()
    return schemas.AISettingOut(selected_model="openrouter-free")
