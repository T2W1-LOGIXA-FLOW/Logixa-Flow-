"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminFetch } from "@/components/api";
import EstimatorForm from "@/components/estimator/EstimatorForm";
import EstimatorResults from "@/components/estimator/EstimatorResults";
import VehicleSelector from "@/components/estimator/VehicleSelector";
import { Estimates as EstimatorEstimates } from "@/lib/estimatorUtils";
import { getAdminSessionToken } from "@/lib/adminSession";

interface VehicleType {
  id: string;
  name: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  max_weight: number;
}

interface SavedEstimate {
  id: number;
  vehicle_id: string;
  carton_length_cm: number;
  carton_width_cm: number;
  carton_height_cm: number;
  carton_weight_kg: number;
  quantity: number;
  total_volume_cm3: number;
  total_weight_kg: number;
  total_estimates: number;
  estimated_capacity_percent: number;
  estimated_weight_percent: number;
  can_fit_by_volume: boolean;
  can_fit_by_weight: boolean;
  created_at: string;
  notes: string;
}

interface EstimateMeta {
  capacityPercent: number;
  weightPercent: number;
  canFitByVolume: boolean;
  canFitByWeight: boolean;
}

export default function PremiumLogisticsEstimator() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [token, setToken] = useState("");
  const [vehicles, setVehicles] = useState<VehicleType[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);
  const [customDimensions, setCustomDimensions] = useState({
    length: "",
    width: "",
    height: "",
    maxWeight: "",
  });
  const [carton, setCarton] = useState({
    length: "",
    width: "",
    height: "",
    weight: "",
    quantity: "",
  });
  const [lengthUnit, setLengthUnit] = useState<"cm" | "m" | "inch">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [estimates, setEstimates] = useState<EstimatorEstimates | null>(null);
  const [estimateMeta, setEstimateMeta] = useState<EstimateMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedEstimates, setSavedEstimates] = useState<SavedEstimate[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const saved = getAdminSessionToken();
    if (!saved) {
      router.push("/admin/login");
      return;
    }

    setToken(saved);
    setAuthorized(true);
    loadVehicleTypes(saved);
    loadEstimateHistory(saved);
  }, [router]);

  const loadVehicleTypes = async (authToken: string) => {
    try {
      const response = await adminFetch("/api/estimator/vehicles", authToken);
      if (!response.ok) {
        toast.error("Failed to load vehicle types");
        return;
      }

      const data = await response.json();
      const vehiclesWithCustom = [
        ...data,
        {
          id: "custom",
          name: "Custom Vehicle",
          dimensions: { length: 0, width: 0, height: 0 },
          max_weight: 0,
          is_custom: true,
        },
      ];

      setVehicles(vehiclesWithCustom);
      if (vehiclesWithCustom.length > 0) {
        setSelectedVehicle(vehiclesWithCustom[0]);
      }
    } catch (error) {
      console.error("Failed to load vehicle types:", error);
      toast.error("Failed to load vehicle types");
    }
  };

  const loadEstimateHistory = async (authToken: string) => {
    setLoadingHistory(true);
    try {
      const response = await adminFetch("/api/estimator/estimates?limit=10", authToken);
      if (response.ok) {
        const data = await response.json();
        setSavedEstimates(data);
      }
    } catch (error) {
      console.error("Failed to load estimate history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const resetResults = () => {
    setEstimates(null);
    setEstimateMeta(null);
  };

  const handleVehicleChange = (vehicle: VehicleType) => {
    setSelectedVehicle(vehicle);
    resetResults();
  };

  const handleCustomDimensionsChange = (dimensions: typeof customDimensions) => {
    setCustomDimensions(dimensions);
    resetResults();
  };

  const handleCartonChange = (newCarton: typeof carton) => {
    setCarton(newCarton);
    resetResults();
  };

  const handleCalculate = async () => {
    if (!selectedVehicle || !token) {
      return;
    }

    const cartonLength = parseFloat(carton.length) || 0;
    const cartonWidth = parseFloat(carton.width) || 0;
    const cartonHeight = parseFloat(carton.height) || 0;
    const cartonWeight = parseFloat(carton.weight) || 0;
    const quantity = parseFloat(carton.quantity) || 0;

    if (cartonLength <= 0 || cartonWidth <= 0 || cartonHeight <= 0 || cartonWeight <= 0 || quantity <= 0) {
      toast.error("Please enter valid positive values for all fields.");
      return;
    }

    let customVehicle = null;
    if (selectedVehicle.id === "custom") {
      const customLength = parseFloat(customDimensions.length) || 0;
      const customWidth = parseFloat(customDimensions.width) || 0;
      const customHeight = parseFloat(customDimensions.height) || 0;
      const customMaxWeight = parseFloat(customDimensions.maxWeight) || 0;

      if (customLength <= 0 || customWidth <= 0 || customHeight <= 0 || customMaxWeight <= 0) {
        toast.error("Please enter valid custom dimensions.");
        return;
      }

      customVehicle = {
        id: "custom",
        name: "Custom Vehicle",
        length_cm: customLength,
        width_cm: customWidth,
        height_cm: customHeight,
        max_weight_kg: customMaxWeight,
      };
    }

    setLoading(true);
    try {
      const response = await adminFetch("/api/estimator/calculate", token, {
        method: "POST",
        body: JSON.stringify({
          carton: {
            length: cartonLength,
            width: cartonWidth,
            height: cartonHeight,
            weight: cartonWeight,
            quantity,
            length_unit: lengthUnit,
            weight_unit: weightUnit,
          },
          vehicle_id: selectedVehicle.id,
          custom_vehicle: customVehicle,
          save_estimate: true,
          notes: "Admin dashboard estimation",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.detail || "Calculation failed");
        return;
      }

      const data = await response.json();
      const totalVolumeM3 = data.total_volume_cm3 / 1_000_000;
      const actualWeightKg = data.total_weight_kg;
      const volumetricWeightKg = data.total_volume_cm3 / 5000;
      const ratePerKg = 0.5;

      setEstimates({
        over: {
          volume: totalVolumeM3 * 1.1,
          weight: actualWeightKg * 1.05,
          cartonsFit: Math.floor(data.total_estimates * 0.95),
          costLightBulky: volumetricWeightKg * 1.05 * ratePerKg,
          costHeavyCompact: actualWeightKg * 1.05 * ratePerKg,
        },
        likely: {
          volume: totalVolumeM3,
          weight: actualWeightKg,
          cartonsFit: data.total_estimates,
          costLightBulky: volumetricWeightKg * ratePerKg,
          costHeavyCompact: actualWeightKg * ratePerKg,
        },
        under: {
          volume: totalVolumeM3 * 0.9,
          weight: actualWeightKg * 0.95,
          cartonsFit: Math.floor(data.total_estimates * 1.05),
          costLightBulky: volumetricWeightKg * 0.95 * ratePerKg,
          costHeavyCompact: actualWeightKg * 0.95 * ratePerKg,
        },
      });
      setEstimateMeta({
        capacityPercent: data.capacity_percent,
        weightPercent: data.weight_percent,
        canFitByVolume: data.can_fit_by_volume,
        canFitByWeight: data.can_fit_by_weight,
      });
      await loadEstimateHistory(token);
      toast.success("Calculation completed successfully");
    } catch (error) {
      console.error("Calculation error:", error);
      toast.error("Calculation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportHistory = () => {
    if (savedEstimates.length === 0) {
      toast.error("No estimates to export");
      return;
    }

    const headers = [
      "id",
      "created_at",
      "vehicle_id",
      "quantity",
      "carton_length_cm",
      "carton_width_cm",
      "carton_height_cm",
      "carton_weight_kg",
      "total_volume_m3",
      "total_weight_kg",
      "cartons_fit",
      "capacity_percent",
      "weight_percent",
      "can_fit_by_volume",
      "can_fit_by_weight",
    ];
    const rows = savedEstimates.map((estimate) => [
      estimate.id,
      estimate.created_at,
      estimate.vehicle_id,
      estimate.quantity,
      estimate.carton_length_cm,
      estimate.carton_width_cm,
      estimate.carton_height_cm,
      estimate.carton_weight_kg,
      (estimate.total_volume_cm3 / 1_000_000).toFixed(3),
      estimate.total_weight_kg.toFixed(2),
      estimate.total_estimates,
      estimate.estimated_capacity_percent.toFixed(1),
      estimate.estimated_weight_percent.toFixed(1),
      estimate.can_fit_by_volume,
      estimate.can_fit_by_weight,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `logixa-estimates-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Estimate history exported");
  };

  const handleDeleteEstimate = async (estimateId: number) => {
    if (!token) {
      return;
    }

    try {
      const response = await adminFetch(`/api/estimator/estimates/${estimateId}`, token, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.detail || "Failed to delete estimate");
        return;
      }

      setSavedEstimates((current) => current.filter((estimate) => estimate.id !== estimateId));
      toast.success("Estimate deleted");
    } catch (error) {
      console.error("Delete estimate error:", error);
      toast.error("Failed to delete estimate");
    }
  };

  if (!authorized) {
    return null;
  }

  if (!selectedVehicle) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-slate-400">Loading vehicle types...</div>
      </div>
    );
  }

  const estimatorCards = [
    {
      label: "Vehicle profiles",
      value: String(Math.max(vehicles.length - 1, 0)),
      detail: "Saved backend profiles",
    },
    {
      label: "Saved estimates",
      value: String(savedEstimates.length),
      detail: "Recent capacity checks",
    },
    {
      label: "Current vehicle",
      value: selectedVehicle.name,
      detail: "Active planning mode",
    },
    {
      label: "Export format",
      value: "CSV",
      detail: "History export ready",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-orange-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="text-cyan-400"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-cyan-400 to-orange-400 bg-clip-text text-2xl font-bold text-transparent">
                Logistics Estimator
              </h1>
              <p className="text-sm text-slate-400">Admin operations tool for capacity planning</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory && savedEstimates.length === 0) {
                loadEstimateHistory(token);
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700/50 sm:w-auto"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <path d="M3 3v5h5" />
              <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
              <path d="M12 7v5l4 2" />
            </svg>
            {showHistory ? "Hide History" : "Show History"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {estimatorCards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-cyan-400/15 bg-slate-900/70 p-4 shadow-xl shadow-black/10 backdrop-blur-xl"
          >
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{card.label}</span>
            <strong className="mt-2 block truncate text-2xl font-black text-white">{card.value}</strong>
            <p className="mt-2 text-sm text-slate-400">{card.detail}</p>
          </article>
        ))}
      </div>

      {showHistory && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-white">Recent Estimates</h3>
            {savedEstimates.length > 0 && (
              <button
                onClick={handleExportHistory}
                className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
              >
                Export CSV
              </button>
            )}
          </div>

          {loadingHistory ? (
            <div className="py-8 text-center text-slate-400">Loading history...</div>
          ) : savedEstimates.length === 0 ? (
            <div className="py-8 text-center text-slate-400">No saved estimates found</div>
          ) : (
            <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {savedEstimates.map((estimate) => (
                <div
                  key={estimate.id}
                  className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 transition hover:bg-slate-800/70"
                >
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-medium text-cyan-300">
                        {new Date(estimate.created_at).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500">Vehicle: {estimate.vehicle_id}</div>
                    </div>
                    <div className="text-xs text-slate-400">
                      Qty: {estimate.quantity} x {estimate.carton_length_cm} x {estimate.carton_width_cm} x{" "}
                      {estimate.carton_height_cm} cm
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                    <div>
                      <span className="text-slate-500">Volume:</span>
                      <span className="ml-1 text-white">{(estimate.total_volume_cm3 / 1_000_000).toFixed(3)} m3</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Weight:</span>
                      <span className="ml-1 text-white">{estimate.total_weight_kg.toFixed(2)} kg</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Fit:</span>
                      <span className="ml-1 text-white">{estimate.total_estimates} cartons</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span
                        className={`rounded-full border px-2 py-1 ${
                          estimate.can_fit_by_volume
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                            : "border-red-500/30 bg-red-500/10 text-red-200"
                        }`}
                      >
                        Volume {estimate.estimated_capacity_percent.toFixed(1)}%
                      </span>
                      <span
                        className={`rounded-full border px-2 py-1 ${
                          estimate.can_fit_by_weight
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                            : "border-red-500/30 bg-red-500/10 text-red-200"
                        }`}
                      >
                        Weight {estimate.estimated_weight_percent.toFixed(1)}%
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteEstimate(estimate.id)}
                      className="self-start rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/20 sm:self-auto"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <VehicleSelector
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onVehicleChange={handleVehicleChange}
            customDimensions={customDimensions}
            onCustomDimensionsChange={handleCustomDimensionsChange}
          />
          <EstimatorForm
            carton={carton}
            onCartonChange={handleCartonChange}
            lengthUnit={lengthUnit}
            onLengthUnitChange={setLengthUnit}
            weightUnit={weightUnit}
            onWeightUnitChange={setWeightUnit}
            onCalculate={handleCalculate}
            loading={loading}
          />
        </div>

        <div className="space-y-6">
          {estimates ? (
            <EstimatorResults
              estimates={estimates}
              lengthUnit={lengthUnit}
              weightUnit={weightUnit}
              meta={estimateMeta || undefined}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl lg:p-8">
              <div className="text-center text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1"
                  className="mx-auto mb-4 opacity-50"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <p className="text-sm">Enter dimensions and calculate to see results</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
