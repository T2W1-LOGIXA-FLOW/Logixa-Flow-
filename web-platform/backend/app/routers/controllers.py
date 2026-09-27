from __future__ import annotations

from datetime import datetime, timezone
import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import require_admin

router = APIRouter()


@router.get("", response_model=list[schemas.ControllerOut])
def get_controllers(
    enabled_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Get all controllers.
    """
    query = db.query(models.Controller)
    if enabled_only:
        query = query.filter(models.Controller.enabled == True)
    return query.order_by(models.Controller.created_at.desc()).all()


@router.get("/{controller_id}", response_model=schemas.ControllerOut)
def get_controller(
    controller_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Get a specific controller by ID.
    """
    controller = db.query(models.Controller).filter(models.Controller.id == controller_id).first()
    if not controller:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Controller not found")
    return controller


@router.post("", response_model=schemas.ControllerOut, status_code=status.HTTP_201_CREATED)
def create_controller(
    controller: schemas.ControllerCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Create a new controller.
    """
    # Check if controller ID already exists
    existing = db.query(models.Controller).filter(models.Controller.id == controller.id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Controller ID already exists")
    
    db_controller = models.Controller(
        id=controller.id,
        name=controller.name,
        trigger_type=controller.trigger_type,
        enabled=controller.enabled,
        config=str(controller.config) if controller.config else None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(db_controller)
    db.commit()
    db.refresh(db_controller)
    return db_controller


@router.patch("/{controller_id}", response_model=schemas.ControllerOut)
def update_controller(
    controller_id: str,
    update: schemas.ControllerUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Update a controller (partial update).
    """
    controller = db.query(models.Controller).filter(models.Controller.id == controller_id).first()
    if not controller:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Controller not found")
    
    if update.name is not None:
        controller.name = update.name
    if update.trigger_type is not None:
        controller.trigger_type = update.trigger_type
    if update.enabled is not None:
        controller.enabled = update.enabled
    if update.config is not None:
        controller.config = str(update.config)
    
    controller.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(controller)
    return controller


@router.delete("/{controller_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_controller(
    controller_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Delete a controller.
    """
    controller = db.query(models.Controller).filter(models.Controller.id == controller_id).first()
    if not controller:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Controller not found")
    
    db.delete(controller)
    db.commit()
    return None


@router.post("/{controller_id}/execute")
async def execute_controller(
    controller_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    controller = db.query(models.Controller).filter(models.Controller.id == controller_id).first()
    if not controller:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Controller not found")
    if not controller.enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Controller is not enabled")

    try:
        config = json.loads(controller.config or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Controller config must be valid JSON") from exc

    workflow_id = config.get("workflow_id")
    if not isinstance(workflow_id, str) or not workflow_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Controller config requires a workflow_id",
        )

    priority = int(config.get("priority", 1))
    delay_seconds = int(config.get("delay_seconds", 0))

    from . import workflow as workflow_router
    run = await workflow_router.enqueue_workflow_run(
        workflow_id=workflow_id,
        priority=priority,
        delay_seconds=delay_seconds,
        controller_id=controller.id,
    )

    return {
        "success": False,
        "queued": True,
        "message": f"Controller '{controller.name}' queued workflow '{workflow_id}'.",
        "run": run,
        "controller": schemas.ControllerOut.model_validate(controller),
    }


@router.post("/{controller_id}/reset-stats")
def reset_controller_stats(
    controller_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Reset execution statistics for a controller.
    """
    controller = db.query(models.Controller).filter(models.Controller.id == controller_id).first()
    if not controller:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Controller not found")
    
    controller.success_count = 0
    controller.failure_count = 0
    controller.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(controller)
    
    return {"message": "Controller statistics reset successfully"}
