"use client";

import React from "react";
import Card from "@/components/shadcn/Card";
import { Estimates, formatNumber, getDominantCostType } from "@/lib/estimatorUtils";

interface EstimatorResultsProps {
  estimates: Estimates;
  lengthUnit: "cm" | "m" | "inch";
  weightUnit: "kg" | "lb";
  meta?: {
    capacityPercent: number;
    weightPercent: number;
    canFitByVolume: boolean;
    canFitByWeight: boolean;
  };
}

export default function EstimatorResults({
  estimates,
  weightUnit,
  meta,
}: EstimatorResultsProps) {
  const { over, likely, under } = estimates;

  const formatVolume = (volume: number) => `${formatNumber(volume, 3)} m3`;
  const formatWeight = (weight: number) => `${formatNumber(weight, 2)} ${weightUnit}`;
  const formatCost = (cost: number) => `$${formatNumber(cost, 2)}`;
  const dominant = getDominantCostType(likely.costLightBulky, likely.costHeavyCompact);

  return (
    <Card className="p-6 bg-slate-900/70 backdrop-blur-xl border-slate-700/50">
      <h3 className="text-lg font-semibold mb-6 text-white">Results & Estimates</h3>

      <div className="space-y-6">
        {meta && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className={`rounded-lg border p-4 ${meta.canFitByVolume ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
              <div className="text-xs text-slate-400 mb-1">Volume Usage</div>
              <div className={meta.canFitByVolume ? "text-xl font-bold text-emerald-300" : "text-xl font-bold text-red-300"}>
                {formatNumber(meta.capacityPercent, 1)}%
              </div>
            </div>
            <div className={`rounded-lg border p-4 ${meta.canFitByWeight ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
              <div className="text-xs text-slate-400 mb-1">Weight Usage</div>
              <div className={meta.canFitByWeight ? "text-xl font-bold text-emerald-300" : "text-xl font-bold text-red-300"}>
                {formatNumber(meta.weightPercent, 1)}%
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-1">Total Volume</div>
            <div className="text-xl font-bold text-cyan-400">{formatVolume(likely.volume)}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-1">Total Weight</div>
            <div className="text-xl font-bold text-orange-400">{formatWeight(likely.weight)}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-1">Cartons Fit</div>
            <div className="text-xl font-bold text-green-400">{likely.cartonsFit}</div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3">Volume & Weight Estimates</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">Estimate Type</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Volume (m3)</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Weight ({weightUnit})</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Cartons Fit</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-700/50 hover:bg-slate-800/30">
                  <td className="py-3 px-3 text-slate-400">Under (-10% vol, -5% weight)</td>
                  <td className="text-right py-3 px-3 font-mono">{formatVolume(under.volume)}</td>
                  <td className="text-right py-3 px-3 font-mono">{formatWeight(under.weight)}</td>
                  <td className="text-right py-3 px-3 font-mono">{under.cartonsFit}</td>
                </tr>
                <tr className="bg-cyan-500/10 border-b border-slate-700/50">
                  <td className="py-3 px-3 font-semibold text-cyan-400">Likely (Exact)</td>
                  <td className="text-right py-3 px-3 font-mono font-bold text-cyan-400">{formatVolume(likely.volume)}</td>
                  <td className="text-right py-3 px-3 font-mono font-bold text-cyan-400">{formatWeight(likely.weight)}</td>
                  <td className="text-right py-3 px-3 font-mono font-bold text-cyan-400">{likely.cartonsFit}</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 text-slate-400">Over (+10% vol, +5% weight)</td>
                  <td className="text-right py-3 px-3 font-mono">{formatVolume(over.volume)}</td>
                  <td className="text-right py-3 px-3 font-mono">{formatWeight(over.weight)}</td>
                  <td className="text-right py-3 px-3 font-mono">{over.cartonsFit}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3">Cost Estimates (Density-Based)</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className={`bg-gradient-to-br from-orange-500/10 to-yellow-500/10 rounded-lg p-4 border ${dominant === "light-bulky" ? "border-orange-500/50" : "border-slate-700"}`}>
              <div className="text-xs text-slate-400 mb-1">Light & Bulky (Volumetric Weight)</div>
              <div className="text-2xl font-bold text-orange-400">{formatCost(likely.costLightBulky)}</div>
              <div className="text-xs text-slate-500 mt-1">Based on volumetric weight</div>
              {dominant === "light-bulky" && <div className="text-xs text-orange-400 font-medium mt-2">Dominant cost</div>}
            </div>
            <div className={`bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg p-4 border ${dominant === "heavy-compact" ? "border-blue-500/50" : "border-slate-700"}`}>
              <div className="text-xs text-slate-400 mb-1">Heavy & Compact (Actual Weight)</div>
              <div className="text-2xl font-bold text-blue-400">{formatCost(likely.costHeavyCompact)}</div>
              <div className="text-xs text-slate-500 mt-1">Based on actual weight</div>
              {dominant === "heavy-compact" && <div className="text-xs text-blue-400 font-medium mt-2">Dominant cost</div>}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
