from __future__ import annotations

from dataclasses import dataclass
from typing import TypedDict
from enum import Enum


class LengthUnit(Enum):
    CM = "cm"
    M = "m"
    INCH = "inch"


class WeightUnit(Enum):
    KG = "kg"
    LB = "lb"


@dataclass
class VehicleType:
    id: str
    name: str
    dimensions: dict[str, float]  # length, width, height in cm
    max_weight: float  # in kg


@dataclass
class CartonDimensions:
    length: float  # in cm
    width: float  # in cm
    height: float  # in cm
    weight: float  # in kg


@dataclass
class EstimationResult:
    capacity_percent: float
    weight_percent: float
    can_fit_by_volume: bool
    can_fit_by_weight: bool
    total_estimates: int
    total_volume_cm3: float
    total_weight_kg: float
    vehicle_volume_cm3: float
    details: dict


# Standard vehicle types
STANDARD_VEHICLES: dict[str, VehicleType] = {
    "20ft_container": VehicleType(
        id="20ft_container",
        name="20ft Container",
        dimensions={"length": 589.0, "width": 235.0, "height": 239.0},
        max_weight=28000.0,
    ),
    "40ft_container": VehicleType(
        id="40ft_container",
        name="40ft Container",
        dimensions={"length": 1203.0, "width": 235.0, "height": 239.0},
        max_weight=26700.0,
    ),
    "40ft_high_cube": VehicleType(
        id="40ft_high_cube",
        name="40ft High Cube",
        dimensions={"length": 1203.0, "width": 235.0, "height": 269.0},
        max_weight=26700.0,
    ),
    "pickup_truck": VehicleType(
        id="pickup_truck",
        name="Pickup Truck",
        dimensions={"length": 200.0, "width": 150.0, "height": 100.0},
        max_weight=1000.0,
    ),
    "delivery_van": VehicleType(
        id="delivery_van",
        name="Delivery Van",
        dimensions={"length": 400.0, "width": 180.0, "height": 180.0},
        max_weight=3500.0,
    ),
    "box_truck": VehicleType(
        id="box_truck",
        name="Box Truck",
        dimensions={"length": 600.0, "width": 240.0, "height": 240.0},
        max_weight=10000.0,
    ),
}


def convert_to_cm(value: float, unit: LengthUnit) -> float:
    """Convert any length unit to centimeters."""
    if unit == LengthUnit.CM:
        return value
    elif unit == LengthUnit.M:
        return value * 100.0
    elif unit == LengthUnit.INCH:
        return value * 2.54
    else:
        raise ValueError(f"Unknown length unit: {unit}")


def convert_to_kg(value: float, unit: WeightUnit) -> float:
    """Convert any weight unit to kilograms."""
    if unit == WeightUnit.KG:
        return value
    elif unit == WeightUnit.LB:
        return value * 0.453592
    else:
        raise ValueError(f"Unknown weight unit: {unit}")


def calculate_volume(length_cm: float, width_cm: float, height_cm: float) -> float:
    """Calculate volume in cubic centimeters."""
    return length_cm * width_cm * height_cm


def calculate_optimal_packing(
    carton_length: float,
    carton_width: float,
    carton_height: float,
    vehicle_length: float,
    vehicle_width: float,
    vehicle_height: float,
) -> int:
    """
    Calculate the optimal number of cartons that can fit in the vehicle
    considering different orientations (rotations).
    """
    carton_volume = calculate_volume(carton_length, carton_width, carton_height)
    vehicle_volume = calculate_volume(vehicle_length, vehicle_width, vehicle_height)
    
    # Try different orientations
    orientations = [
        (carton_length, carton_width, carton_height),
        (carton_length, carton_height, carton_width),
        (carton_width, carton_length, carton_height),
        (carton_width, carton_height, carton_length),
        (carton_height, carton_length, carton_width),
        (carton_height, carton_width, carton_length),
    ]
    
    max_estimate = 0
    for cl, cw, ch in orientations:
        # Calculate how many cartons fit in each dimension
        l_fit = int(vehicle_length // cl)
        w_fit = int(vehicle_width // cw)
        h_fit = int(vehicle_height // ch)
        estimate = l_fit * w_fit * h_fit
        max_estimate = max(max_estimate, estimate)
    
    # Fallback to volume-based estimate if no orientation works
    if max_estimate == 0:
        max_estimate = int(vehicle_volume // carton_volume)
    
    return max_estimate


def calculate_logistics_estimate(
    carton: CartonDimensions,
    quantity: int,
    vehicle: VehicleType,
) -> EstimationResult:
    """
    Calculate logistics estimates for shipping cartons in a vehicle.
    """
    # Calculate volumes
    carton_volume = calculate_volume(carton.length, carton.width, carton.height)
    vehicle_volume = calculate_volume(
        vehicle.dimensions["length"],
        vehicle.dimensions["width"],
        vehicle.dimensions["height"],
    )
    
    # Calculate totals
    total_volume_cm3 = carton_volume * quantity
    total_weight_kg = carton.weight * quantity
    
    # Calculate optimal packing
    max_by_volume = calculate_optimal_packing(
        carton.length,
        carton.width,
        carton.height,
        vehicle.dimensions["length"],
        vehicle.dimensions["width"],
        vehicle.dimensions["height"],
    )
    
    # Calculate limits
    max_by_weight = int(vehicle.max_weight // carton.weight)
    
    # Determine actual capacity
    total_estimates = min(quantity, max_by_volume, max_by_weight)
    
    # Calculate percentages
    capacity_percent = (total_volume_cm3 / vehicle_volume) * 100 if vehicle_volume > 0 else 0
    weight_percent = (total_weight_kg / vehicle.max_weight) * 100 if vehicle.max_weight > 0 else 0
    
    # Determine if cartons can fit
    can_fit_by_volume = quantity <= max_by_volume
    can_fit_by_weight = quantity <= max_by_weight
    
    # Build details
    details = {
        "carton_volume_cm3": carton_volume,
        "carton_weight_kg": carton.weight,
        "max_by_volume": max_by_volume,
        "max_by_weight": max_by_weight,
        "limiting_factor": "weight" if max_by_weight < max_by_volume else "volume",
        "vehicle_name": vehicle.name,
        "vehicle_volume_cm3": vehicle_volume,
        "vehicle_max_weight_kg": vehicle.max_weight,
    }
    
    return EstimationResult(
        capacity_percent=round(capacity_percent, 2),
        weight_percent=round(weight_percent, 2),
        can_fit_by_volume=can_fit_by_volume,
        can_fit_by_weight=can_fit_by_weight,
        total_estimates=total_estimates,
        total_volume_cm3=total_volume_cm3,
        total_weight_kg=total_weight_kg,
        vehicle_volume_cm3=vehicle_volume,
        details=details,
    )


def get_vehicle_type(vehicle_id: str, custom_dimensions: dict[str, float] | None = None) -> VehicleType:
    """
    Get a vehicle type by ID or create a custom vehicle type.
    """
    if vehicle_id == "custom" and custom_dimensions:
        return VehicleType(
            id="custom",
            name="Custom Vehicle",
            dimensions={
                "length": custom_dimensions.get("length", 0),
                "width": custom_dimensions.get("width", 0),
                "height": custom_dimensions.get("height", 0),
            },
            max_weight=custom_dimensions.get("max_weight", 0),
        )
    elif vehicle_id in STANDARD_VEHICLES:
        return STANDARD_VEHICLES[vehicle_id]
    else:
        raise ValueError(f"Unknown vehicle type: {vehicle_id}")


def get_all_vehicle_types() -> list[dict[str, any]]:
    """
    Get all standard vehicle types for API responses.
    """
    return [
        {
            "id": vehicle.id,
            "name": vehicle.name,
            "dimensions": vehicle.dimensions,
            "max_weight": vehicle.max_weight,
        }
        for vehicle in STANDARD_VEHICLES.values()
    ]
