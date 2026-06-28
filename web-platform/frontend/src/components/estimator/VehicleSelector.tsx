"use client";

import React from "react";
import Card from "@/components/shadcn/Card";
import Input from "@/components/shadcn/Input";

interface VehicleType {
  id: string;
  name: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  max_weight: number;
  is_custom?: boolean;
}

interface VehicleSelectorProps {
  vehicles: VehicleType[];
  selectedVehicle: VehicleType;
  onVehicleChange: (vehicle: VehicleType) => void;
  customDimensions: {
    length: string;
    width: string;
    height: string;
    maxWeight: string;
  };
  onCustomDimensionsChange: (dimensions: {
    length: string;
    width: string;
    height: string;
    maxWeight: string;
  }) => void;
}

export default function VehicleSelector({
  vehicles,
  selectedVehicle,
  onVehicleChange,
  customDimensions,
  onCustomDimensionsChange,
}: VehicleSelectorProps) {
  const isCustom = selectedVehicle.id === "custom";

  return (
    <Card className="p-6 bg-slate-900/70 backdrop-blur-xl border-slate-700/50">
      <h3 className="text-lg font-semibold mb-4 text-white">Vehicle / Container Type</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">Select Vehicle Type</label>
          <select
            value={selectedVehicle.id}
            onChange={(e) => {
              const vehicle = vehicles.find(v => v.id === e.target.value);
              if (vehicle) onVehicleChange(vehicle);
            }}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition"
          >
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name}
              </option>
            ))}
          </select>
        </div>

        {selectedVehicle && (
          <div className="bg-slate-800/30 rounded-lg p-4 space-y-2 border border-slate-700/30">
            <div className="text-sm text-slate-400">Selected: <span className="text-white font-medium">{selectedVehicle.name}</span></div>
            {!isCustom && (
              <>
                <div className="text-sm text-slate-400">
                  Dimensions: <span className="text-white">{selectedVehicle.dimensions.length} x {selectedVehicle.dimensions.width} x {selectedVehicle.dimensions.height} cm</span>
                </div>
                <div className="text-sm text-slate-400">
                  Max Weight: <span className="text-white">{selectedVehicle.max_weight.toLocaleString()} kg</span>
                </div>
              </>
            )}
          </div>
        )}

        {isCustom && (
          <div className="space-y-3 pt-4 border-t border-slate-700/50">
            <h4 className="text-sm font-medium text-slate-300">Custom Dimensions (cm)</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Length</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={customDimensions.length}
                  onChange={(e) => onCustomDimensionsChange({
                    ...customDimensions,
                    length: e.target.value
                  })}
                  className="bg-slate-800/50 border-slate-700/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Width</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={customDimensions.width}
                  onChange={(e) => onCustomDimensionsChange({
                    ...customDimensions,
                    width: e.target.value
                  })}
                  className="bg-slate-800/50 border-slate-700/50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Height</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={customDimensions.height}
                  onChange={(e) => onCustomDimensionsChange({
                    ...customDimensions,
                    height: e.target.value
                  })}
                  className="bg-slate-800/50 border-slate-700/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max Weight (kg)</label>
              <Input
                type="number"
                placeholder="0"
                value={customDimensions.maxWeight}
                onChange={(e) => onCustomDimensionsChange({
                  ...customDimensions,
                  maxWeight: e.target.value
                })}
                className="bg-slate-800/50 border-slate-700/50"
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
