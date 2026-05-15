import type { PlotThresholdProfile } from "@/lib/farm-data";

export const DEFAULT_THRESHOLD_PROFILE: PlotThresholdProfile = {
  moisture: [25, 55],
  temp: [18, 30],
  humidity: [40, 75],
  ph: [6.0, 7.2],
  growthStage: "Vegetative",
  autoAdjust: true,
};

function isNumPair(v: unknown): v is [number, number] {
  return Array.isArray(v) && v.length === 2 && typeof v[0] === "number" && typeof v[1] === "number";
}

/** Parse JSON from `farm_plots.threshold_profile`; returns null if invalid. */
export function parsePlotThresholdProfile(raw: unknown): PlotThresholdProfile | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!isNumPair(o.moisture) || !isNumPair(o.temp) || !isNumPair(o.humidity) || !isNumPair(o.ph)) return null;
  const growthStage = typeof o.growthStage === "string" && o.growthStage.trim() ? o.growthStage.trim() : "Vegetative";
  const autoAdjust = typeof o.autoAdjust === "boolean" ? o.autoAdjust : true;
  return {
    moisture: [o.moisture[0], o.moisture[1]],
    temp: [o.temp[0], o.temp[1]],
    humidity: [o.humidity[0], o.humidity[1]],
    ph: [o.ph[0], o.ph[1]],
    growthStage,
    autoAdjust,
  };
}

export function serializePlotThresholdProfile(p: PlotThresholdProfile): Record<string, unknown> {
  return {
    moisture: p.moisture,
    temp: p.temp,
    humidity: p.humidity,
    ph: p.ph,
    growthStage: p.growthStage,
    autoAdjust: p.autoAdjust,
  };
}
