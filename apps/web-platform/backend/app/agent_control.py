from __future__ import annotations

import json
import time
from typing import Any

from sqlalchemy.orm import Session

from . import models

GLOBAL_CONTROL_KEY = "agent_runtime_control:global"


def read_agent_control(db: Session) -> dict[str, Any]:
    """Read the persisted operator control state shared across app workers."""
    db.expire_all()
    setting = db.query(models.AppSetting).filter(models.AppSetting.key == GLOBAL_CONTROL_KEY).first()
    if not setting:
        return {"paused": False, "pending_guidance": ""}
    try:
        value = json.loads(setting.value)
    except (TypeError, json.JSONDecodeError):
        return {"paused": False, "pending_guidance": ""}
    return {
        "paused": bool(value.get("paused", False)),
        "pending_guidance": str(value.get("pending_guidance") or "")[:2000],
    }


def write_agent_control(db: Session, *, paused: bool, pending_guidance: str = "") -> dict[str, Any]:
    value = {"paused": paused, "pending_guidance": pending_guidance[:2000]}
    setting = db.query(models.AppSetting).filter(models.AppSetting.key == GLOBAL_CONTROL_KEY).first()
    if setting is None:
        setting = models.AppSetting(key=GLOBAL_CONTROL_KEY, value=json.dumps(value))
        db.add(setting)
    else:
        setting.value = json.dumps(value)
    db.commit()
    return value


def wait_if_agent_paused(db: Session) -> str:
    """Pause graph progress at node boundaries and return queued operator guidance."""
    while True:
        control = read_agent_control(db)
        if not control["paused"]:
            break
        time.sleep(0.5)

    guidance = control["pending_guidance"]
    if guidance:
        # Clear only the guidance that was read, preserving a concurrent pause.
        current = read_agent_control(db)
        if current["pending_guidance"] == guidance:
            write_agent_control(db, paused=current["paused"], pending_guidance="")
    return guidance
