"use client";

import React from "react";
import Card from "@/components/shadcn/Card";
import Input from "@/components/shadcn/Input";
import Button from "@/components/shadcn/Button";

interface EstimatorFormProps {
  carton: {
    length: string;
    width: string;
    height: string;
    weight: string;
    quantity: string;
  };
  onCartonChange: (carton: {
    length: string;
    width: string;
    height: string;
    weight: string;
    quantity: string;
  }) => void;
  lengthUnit: 'cm' | 'm' | 'inch';
  onLengthUnitChange: (unit: 'cm' | 'm' | 'inch') => void;
  weightUnit: 'kg' | 'lb';
  onWeightUnitChange: (unit: 'kg' | 'lb') => void;
  onCalculate: () => void;
  loading?: boolean;
}

export default function EstimatorForm({
  carton,
  onCartonChange,
  lengthUnit,
  onLengthUnitChange,
  weightUnit,
  onWeightUnitChange,
  onCalculate,
  loading = false,
}: EstimatorFormProps) {
  return (
    <Card className="p-6 bg-slate-900/70 backdrop-blur-xl border-slate-700/50">
      <h3 className="text-lg font-semibold mb-6 text-white">Carton / Pallet Input</h3>
      
      <div className="space-y-6">
        {/* Unit Selection */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Dimension Unit</label>
            <div className="flex gap-2">
              {(['cm', 'm', 'inch'] as const).map((unit) => (
                <button
                  key={unit}
                  onClick={() => onLengthUnitChange(unit)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    lengthUnit === unit
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                      : 'bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50'
                  }`}
                >
                  {unit.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Weight Unit</label>
            <div className="flex gap-2">
              {(['kg', 'lb'] as const).map((unit) => (
                <button
                  key={unit}
                  onClick={() => onWeightUnitChange(unit)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    weightUnit === unit
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                      : 'bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50'
                  }`}
                >
                  {unit.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Carton Dimensions */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3">Carton Dimensions</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Length ({lengthUnit})</label>
              <Input
                type="number"
                placeholder="0"
                value={carton.length}
                onChange={(e) => onCartonChange({ ...carton, length: e.target.value })}
                className="bg-slate-800/50 border-slate-700/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Width ({lengthUnit})</label>
              <Input
                type="number"
                placeholder="0"
                value={carton.width}
                onChange={(e) => onCartonChange({ ...carton, width: e.target.value })}
                className="bg-slate-800/50 border-slate-700/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Height ({lengthUnit})</label>
              <Input
                type="number"
                placeholder="0"
                value={carton.height}
                onChange={(e) => onCartonChange({ ...carton, height: e.target.value })}
                className="bg-slate-800/50 border-slate-700/50"
              />
            </div>
          </div>
        </div>

        {/* Weight and Quantity */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Weight per Carton ({weightUnit})</label>
            <Input
              type="number"
              placeholder="0"
              value={carton.weight}
              onChange={(e) => onCartonChange({ ...carton, weight: e.target.value })}
              className="bg-slate-800/50 border-slate-700/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Quantity</label>
            <Input
              type="number"
              placeholder="0"
              value={carton.quantity}
              onChange={(e) => onCartonChange({ ...carton, quantity: e.target.value })}
              className="bg-slate-800/50 border-slate-700/50"
            />
          </div>
        </div>

        {/* Calculate Button */}
        <Button
          variant="primary"
          className="w-full py-6 text-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          onClick={onCalculate}
          disabled={loading}
        >
          {loading ? "Calculating..." : "Calculate Estimates"}
        </Button>
      </div>
    </Card>
  );
}
