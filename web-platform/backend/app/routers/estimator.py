from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..logistics_estimator import (
    calculate_logistics_estimate,
    convert_to_cm,
    convert_to_kg,
    get_all_vehicle_types,
    get_vehicle_type,
)
from ..security import require_admin

router = APIRouter()


@router.get("/vehicles", response_model=list[dict])
def get_vehicle_types(
    include_custom: bool = True, 
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin)
):
    """
    Get all available vehicle types for estimation (admin-only).
    """
    # Get standard vehicles from estimator
    standard_vehicles = get_all_vehicle_types()
    
    # Get custom vehicles from database
    custom_vehicles = []
    if include_custom:
        custom_vehicles_db = db.query(models.VehicleType).filter(models.VehicleType.is_active == True).all()
        custom_vehicles = [
            {
                "id": vehicle.id,
                "name": vehicle.name,
                "dimensions": {
                    "length": vehicle.length_cm,
                    "width": vehicle.width_cm,
                    "height": vehicle.height_cm,
                },
                "max_weight": vehicle.max_weight_kg,
                "description": vehicle.description,
                "is_custom": True,
            }
            for vehicle in custom_vehicles_db
        ]
    
    return standard_vehicles + custom_vehicles


@router.post("/vehicles", response_model=schemas.VehicleTypeOut, status_code=status.HTTP_201_CREATED)
def create_custom_vehicle(
    vehicle: schemas.VehicleTypeCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Create a custom vehicle type.
    """
    # Check if vehicle ID already exists
    existing = db.query(models.VehicleType).filter(models.VehicleType.id == vehicle.id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vehicle ID already exists")
    
    # Create custom vehicle
    db_vehicle = models.VehicleType(
        id=vehicle.id,
        name=vehicle.name,
        length_cm=vehicle.length_cm,
        width_cm=vehicle.width_cm,
        height_cm=vehicle.height_cm,
        max_weight_kg=vehicle.max_weight_kg,
        description=vehicle.description,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    
    return db_vehicle


@router.post("/calculate", response_model=schemas.EstimationResultOut)
def calculate_estimate(
    request: schemas.EstimationRequest,
    user_ip: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Calculate logistics estimates (admin-only per Phase 3 requirements).
    """
    # Convert units to metric
    length_unit = request.carton.length_unit
    weight_unit = request.carton.weight_unit
    
    carton_length_cm = convert_to_cm(request.carton.length, length_unit)
    carton_width_cm = convert_to_cm(request.carton.width, length_unit)
    carton_height_cm = convert_to_cm(request.carton.height, length_unit)
    carton_weight_kg = convert_to_kg(request.carton.weight, weight_unit)
    quantity = request.carton.quantity
    
    # Get vehicle type
    if request.vehicle_id == "custom" and request.custom_vehicle:
        vehicle = get_vehicle_type("custom", {
            "length": request.custom_vehicle.length_cm,
            "width": request.custom_vehicle.width_cm,
            "height": request.custom_vehicle.height_cm,
            "max_weight": request.custom_vehicle.max_weight_kg,
        })
    else:
        # Check if it's a custom vehicle in database
        db_vehicle = db.query(models.VehicleType).filter(
            models.VehicleType.id == request.vehicle_id,
            models.VehicleType.is_active == True
        ).first()
        
        if db_vehicle:
            vehicle = get_vehicle_type("custom", {
                "length": db_vehicle.length_cm,
                "width": db_vehicle.width_cm,
                "height": db_vehicle.height_cm,
                "max_weight": db_vehicle.max_weight_kg,
            })
        else:
            vehicle = get_vehicle_type(request.vehicle_id)
    
    # Calculate estimate
    carton = {
        "length": carton_length_cm,
        "width": carton_width_cm,
        "height": carton_height_cm,
        "weight": carton_weight_kg,
    }
    
    result = calculate_logistics_estimate(carton, quantity, vehicle)
    
    # Save to database if requested
    if request.save_estimate:
        estimate = models.LogisticsEstimate(
            vehicle_id=request.vehicle_id,
            carton_length_cm=carton_length_cm,
            carton_width_cm=carton_width_cm,
            carton_height_cm=carton_height_cm,
            carton_weight_kg=carton_weight_kg,
            quantity=quantity,
            vehicle_length_cm=vehicle.dimensions["length"],
            vehicle_width_cm=vehicle.dimensions["width"],
            vehicle_height_cm=vehicle.dimensions["height"],
            vehicle_max_weight_kg=vehicle.max_weight,
            estimated_capacity_percent=result.capacity_percent,
            estimated_weight_percent=result.weight_percent,
            can_fit_by_volume=result.can_fit_by_volume,
            can_fit_by_weight=result.can_fit_by_weight,
            total_estimates=result.total_estimates,
            total_volume_cm3=result.total_volume_cm3,
            total_weight_kg=result.total_weight_kg,
            vehicle_volume_cm3=result.vehicle_volume_cm3,
            user_ip=user_ip,
            notes=request.notes,
            created_at=datetime.now(timezone.utc),
        )
        db.add(estimate)
        db.commit()
        db.refresh(estimate)
        
        # Add to history
        history = models.EstimationHistory(
            estimate_id=estimate.id,
            action="created",
            json_metadata='{"ip": "' + (user_ip or "unknown") + '"}',
            created_at=datetime.now(timezone.utc),
        )
        db.add(history)
        db.commit()
    
    return schemas.EstimationResultOut(
        capacity_percent=result.capacity_percent,
        weight_percent=result.weight_percent,
        can_fit_by_volume=result.can_fit_by_volume,
        can_fit_by_weight=result.can_fit_by_weight,
        total_estimates=result.total_estimates,
        total_volume_cm3=result.total_volume_cm3,
        total_weight_kg=result.total_weight_kg,
        vehicle_volume_cm3=result.vehicle_volume_cm3,
        details=result.details,
    )


@router.get("/estimates", response_model=list[schemas.LogisticsEstimateOut])
def get_estimates(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Get saved estimation history.
    """
    estimates = (
        db.query(models.LogisticsEstimate)
        .order_by(models.LogisticsEstimate.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return estimates


@router.get("/estimates/{estimate_id}", response_model=schemas.LogisticsEstimateOut)
def get_estimate(
    estimate_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Get a specific estimate by ID.
    """
    estimate = db.query(models.LogisticsEstimate).filter(models.LogisticsEstimate.id == estimate_id).first()
    if not estimate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estimate not found")
    return estimate


@router.delete("/estimates/{estimate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_estimate(
    estimate_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Delete a specific estimate.
    """
    estimate = db.query(models.LogisticsEstimate).filter(models.LogisticsEstimate.id == estimate_id).first()
    if not estimate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estimate not found")
    
    # Delete associated history
    db.query(models.EstimationHistory).filter(models.EstimationHistory.estimate_id == estimate_id).delete()
    db.delete(estimate)
    db.commit()
    
    return None


@router.get("/history/{estimate_id}", response_model=list[schemas.EstimationHistoryOut])
def get_estimate_history(
    estimate_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """
    Get history for a specific estimate.
    """
    history = (
        db.query(models.EstimationHistory)
        .filter(models.EstimationHistory.estimate_id == estimate_id)
        .order_by(models.EstimationHistory.created_at.desc())
        .all()
    )
    return history