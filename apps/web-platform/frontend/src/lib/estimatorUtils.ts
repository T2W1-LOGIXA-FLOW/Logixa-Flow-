// Vehicle/Container types with their dimensions and weight capacity
export interface VehicleType {
  id: string;
  name: string;
  dimensions: {
    length: number; // cm
    width: number;  // cm
    height: number; // cm
  };
  maxWeight: number; // kg
}

export const VEHICLE_TYPES: VehicleType[] = [
  {
    id: "14-box-lorry",
    name: "14-box lorry",
    dimensions: { length: 700, width: 240, height: 260 },
    maxWeight: 15000,
  },
  {
    id: "6-wheel-truck",
    name: "6-wheel truck",
    dimensions: { length: 500, width: 200, height: 200 },
    maxWeight: 8000,
  },
  {
    id: "10-wheel-truck",
    name: "10-wheel truck",
    dimensions: { length: 600, width: 220, height: 230 },
    maxWeight: 12000,
  },
  {
    id: "20ft-container",
    name: "20ft container",
    dimensions: { length: 589, width: 235, height: 239 },
    maxWeight: 28000,
  },
  {
    id: "40ft-container",
    name: "40ft container",
    dimensions: { length: 1200, width: 235, height: 239 },
    maxWeight: 26500,
  },
  {
    id: "custom",
    name: "Custom",
    dimensions: { length: 0, width: 0, height: 0 },
    maxWeight: 0,
  },
];

// Unit conversion factors
export const UNIT_CONVERSIONS = {
  length: {
    cm: 1,
    m: 100,
    inch: 2.54,
  },
  weight: {
    kg: 1,
    lb: 0.453592,
  },
};

// Convert length to cm
export function convertToCm(value: number, from: 'cm' | 'm' | 'inch'): number {
  return value * UNIT_CONVERSIONS.length[from];
}

// Convert weight to kg
export function convertToKg(value: number, from: 'kg' | 'lb'): number {
  return value * UNIT_CONVERSIONS.weight[from];
}

// Convert from cm to other units
export function convertFromCm(value: number, to: 'cm' | 'm' | 'inch'): number {
  return value / UNIT_CONVERSIONS.length[to];
}

// Convert from kg to other units
export function convertFromKg(value: number, to: 'kg' | 'lb'): number {
  return value / UNIT_CONVERSIONS.weight[to];
}

// Calculate volume in cubic meters from cm dimensions
export function calculateVolumeM3(length: number, width: number, height: number): number {
  return (length * width * height) / 1_000_000;
}

// Calculate volumetric weight (standard formula: L x W x H / 5000 for cm)
export function calculateVolumetricWeight(length: number, width: number, height: number): number {
  return (length * width * height) / 5000;
}

// Estimate types
export interface Estimate {
  volume: number; // m³
  weight: number; // kg
  cartonsFit: number;
  costLightBulky: number;
  costHeavyCompact: number;
}

export interface Estimates {
  over: Estimate;
  likely: Estimate;
  under: Estimate;
}

// Calculate estimates based on carton dimensions and vehicle type
export function calculateEstimates(
  carton: {
    length: number;
    width: number;
    height: number;
    weight: number;
  },
  quantity: number,
  vehicle: VehicleType
): Estimates {
  const volPerCarton = calculateVolumeM3(carton.length, carton.width, carton.height);
  const volWeightPerCarton = calculateVolumetricWeight(carton.length, carton.width, carton.height);
  
  const totalVol = volPerCarton * quantity;
  const totalWeight = carton.weight * quantity;
  const totalVolWeight = volWeightPerCarton * quantity;
  
  // Calculate how many cartons fit based on volume and weight limits
  const volFit = Math.floor(calculateVolumeM3(vehicle.dimensions.length, vehicle.dimensions.width, vehicle.dimensions.height) / volPerCarton);
  const weightFit = Math.floor(vehicle.maxWeight / carton.weight);
  const cartonsFit = Math.min(volFit, weightFit, quantity);
  
  // Cost calculation (simplified formula - can be adjusted based on actual pricing)
  const costPerKg = 0.5; // $ per kg
  
  // Likely estimate (exact)
  const likely: Estimate = {
    volume: totalVol,
    weight: totalWeight,
    cartonsFit,
    costLightBulky: totalVolWeight * costPerKg, // Volumetric weight based
    costHeavyCompact: totalWeight * costPerKg, // Actual weight based
  };
  
  // Over estimate (+10% volume, +5% weight)
  const over: Estimate = {
    volume: totalVol * 1.1,
    weight: totalWeight * 1.05,
    cartonsFit: Math.floor(cartonsFit * 0.95), // Slightly fewer cartons fit
    costLightBulky: totalVolWeight * 1.05 * costPerKg,
    costHeavyCompact: totalWeight * 1.05 * costPerKg,
  };
  
  // Under estimate (-10% volume, -5% weight)
  const under: Estimate = {
    volume: totalVol * 0.9,
    weight: totalWeight * 0.95,
    cartonsFit: Math.floor(cartonsFit * 1.05), // Slightly more cartons fit
    costLightBulky: totalVolWeight * 0.95 * costPerKg,
    costHeavyCompact: totalWeight * 0.95 * costPerKg,
  };
  
  return { over, likely, under };
}

// Format number to specified decimal places
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

// Get the dominant cost (light & bulky vs heavy & compact)
export function getDominantCostType(lightBulkyCost: number, heavyCompactCost: number): 'light-bulky' | 'heavy-compact' {
  return lightBulkyCost > heavyCompactCost ? 'light-bulky' : 'heavy-compact';
}
