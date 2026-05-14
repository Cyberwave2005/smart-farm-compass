// Farm domain types + static fallback data (used when Supabase is not configured or query fails).
// Live dashboard data is loaded via `getFarmSnapshot` server fn → Supabase when `SUPABASE_URL` + `SUPABASE_ANON_KEY` are set.

export type Field = {
  id: string;
  name: string;
  crop: string;
  stage: string;
  area: number; // hectares
  health: number; // 0-100
  moisture: number;
  temp: number;
  humidity: number;
  ph: number;
  status: "healthy" | "warning" | "critical";
};

export type Alert = {
  id: string;
  level: "critical" | "warning" | "info";
  title: string;
  field: string;
  time: string;
  resolved: boolean;
};

export type Recommendation = {
  id: string;
  type: "irrigation" | "fertilizer" | "disease" | "climate";
  field: string;
  crop: string;
  title: string;
  reason: string;
  confidence: number;
};

export type Device = {
  id: string;
  name: string;
  type: "moisture" | "weather" | "ph" | "valve" | "camera";
  field: string;
  status: "online" | "offline" | "degraded";
  lastSeen: string;
  latencyMs: number;
};

export type WebhookEvent = {
  id: string;
  source: string;
  status: "success" | "failed" | "retry";
  ts: string;
  latency: number;
};

export type FarmSnapshotSource = "supabase" | "fallback";

export type FarmSnapshot = {
  source: FarmSnapshotSource;
  fields: Field[];
  alerts: Alert[];
  recommendations: Recommendation[];
  devices: Device[];
  webhookEvents: WebhookEvent[];
};

export const FALLBACK_FIELDS: Field[] = [
  { id: "f1", name: "UZ North Research Plot", crop: "Maize", stage: "Vegetative", area: 12.4, health: 92, moisture: 38, temp: 24, humidity: 64, ph: 6.5, status: "healthy" },
  { id: "f2", name: "Mukuvisi Irrigation Block", crop: "Tomato", stage: "Flowering", area: 5.8, health: 76, moisture: 22, temp: 28, humidity: 55, ph: 6.8, status: "warning" },
  { id: "f3", name: "Mt Pleasant Greenhouse", crop: "Lettuce", stage: "Mature", area: 1.2, health: 88, moisture: 52, temp: 21, humidity: 72, ph: 6.2, status: "healthy" },
  { id: "f4", name: "Avondale Citrus Orchard", crop: "Citrus", stage: "Fruiting", area: 8.0, health: 64, moisture: 18, temp: 31, humidity: 41, ph: 6.9, status: "critical" },
  { id: "f5", name: "Ruwa Grain Block", crop: "Wheat", stage: "Heading", area: 18.6, health: 81, moisture: 34, temp: 26, humidity: 58, ph: 7.0, status: "healthy" },
];

export const FALLBACK_ALERTS: Alert[] = [
  { id: "a1", level: "critical", title: "Soil moisture below 20% threshold", field: "Avondale Citrus Orchard", time: "2 min ago", resolved: false },
  { id: "a2", level: "warning", title: "Temperature trending high", field: "Mukuvisi Irrigation Block", time: "14 min ago", resolved: false },
  { id: "a3", level: "warning", title: "pH drift detected", field: "Mt Pleasant Greenhouse", time: "1 hr ago", resolved: false },
  { id: "a4", level: "info", title: "Rain forecast within 24h", field: "All fields", time: "2 hr ago", resolved: false },
  { id: "a5", level: "critical", title: "Sensor offline > 30 min", field: "UZ North Research Plot", time: "3 hr ago", resolved: true },
];

export const FALLBACK_RECOMMENDATIONS: Recommendation[] = [
  {
    id: "r1",
    type: "irrigation",
    field: "Avondale Citrus Orchard",
    crop: "Citrus",
    title: "Irrigate 18mm within 4 hours",
    reason: "Moisture at 18% — 6pts below stage threshold. Forecast: no rain, 31°C peak.",
    confidence: 0.94,
  },
  {
    id: "r2",
    type: "fertilizer",
    field: "Mukuvisi Irrigation Block",
    crop: "Tomato",
    title: "Apply potassium-rich foliar feed",
    reason: "Flowering stage + leaf yellowing pattern. Past 14d nutrient draw 22% above baseline.",
    confidence: 0.81,
  },
  {
    id: "r3",
    type: "disease",
    field: "Mt Pleasant Greenhouse",
    crop: "Lettuce",
    title: "Monitor for downy mildew",
    reason: "Humidity 72% sustained 6h, temp 18-22°C — matches infection model.",
    confidence: 0.67,
  },
  {
    id: "r4",
    type: "climate",
    field: "UZ North Research Plot",
    crop: "Maize",
    title: "Auto-raised moisture floor to 32%",
    reason: "Heatwave forecast (3 days >30°C). Adjusted threshold for vegetative stage.",
    confidence: 0.88,
  },
];

export const FALLBACK_DEVICES: Device[] = [
  { id: "d1", name: "UZ-SoilProbe-N1", type: "moisture", field: "UZ North Research Plot", status: "online", lastSeen: "12s ago", latencyMs: 120 },
  { id: "d2", name: "WeatherStation-A", type: "weather", field: "All fields", status: "online", lastSeen: "8s ago", latencyMs: 95 },
  { id: "d3", name: "Mukuvisi-pH-R3", type: "ph", field: "Mukuvisi Irrigation Block", status: "degraded", lastSeen: "3m ago", latencyMs: 820 },
  { id: "d4", name: "Avondale-Valve-E1", type: "valve", field: "Avondale Citrus Orchard", status: "online", lastSeen: "1m ago", latencyMs: 210 },
  { id: "d5", name: "Ruwa-SoilProbe-W2", type: "moisture", field: "Ruwa Grain Block", status: "offline", lastSeen: "32m ago", latencyMs: 0 },
  { id: "d6", name: "MtPleasant-Cam-S1", type: "camera", field: "Mt Pleasant Greenhouse", status: "online", lastSeen: "45s ago", latencyMs: 340 },
];

/** Deterministic seed (matches Supabase migration `webhook_events`). */
export const FALLBACK_WEBHOOK_EVENTS: WebhookEvent[] = [
  { id: "w0", source: "sensor.moisture", status: "success", ts: "1s ago", latency: 142 },
  { id: "w1", source: "sensor.temp", status: "success", ts: "4s ago", latency: 201 },
  { id: "w2", source: "weather.api", status: "success", ts: "7s ago", latency: 98 },
  { id: "w3", source: "valve.state", status: "failed", ts: "10s ago", latency: 310 },
  { id: "w4", source: "camera.snapshot", status: "success", ts: "13s ago", latency: 256 },
  { id: "w5", source: "sensor.moisture", status: "success", ts: "16s ago", latency: 167 },
  { id: "w6", source: "sensor.temp", status: "success", ts: "19s ago", latency: 189 },
  { id: "w7", source: "weather.api", status: "retry", ts: "22s ago", latency: 420 },
  { id: "w8", source: "valve.state", status: "success", ts: "25s ago", latency: 133 },
  { id: "w9", source: "camera.snapshot", status: "success", ts: "28s ago", latency: 278 },
  { id: "w10", source: "sensor.moisture", status: "success", ts: "31s ago", latency: 151 },
  { id: "w11", source: "sensor.temp", status: "success", ts: "34s ago", latency: 224 },
];

export function getStaticFarmSnapshot(): FarmSnapshot {
  return {
    source: "fallback",
    fields: FALLBACK_FIELDS,
    alerts: FALLBACK_ALERTS,
    recommendations: FALLBACK_RECOMMENDATIONS,
    devices: FALLBACK_DEVICES,
    webhookEvents: FALLBACK_WEBHOOK_EVENTS,
  };
}

// Generate timeseries (still computed client-side for charts)
export function generateSeries(hours = 24, base = 30, variance = 8) {
  return Array.from({ length: hours }).map((_, i) => {
    const t = new Date(Date.now() - (hours - i) * 3600 * 1000);
    return {
      time: `${t.getHours().toString().padStart(2, "0")}:00`,
      value: +(base + Math.sin(i / 3) * variance + (Math.random() - 0.5) * 4).toFixed(1),
    };
  });
}

export function generateMultiSeries(hours = 24) {
  return Array.from({ length: hours }).map((_, i) => {
    const t = new Date(Date.now() - (hours - i) * 3600 * 1000);
    return {
      time: `${t.getHours().toString().padStart(2, "0")}:00`,
      moisture: +(32 + Math.sin(i / 3) * 6 + (Math.random() - 0.5) * 3).toFixed(1),
      temp: +(24 + Math.sin(i / 4 + 1) * 5 + (Math.random() - 0.5) * 2).toFixed(1),
      humidity: +(60 + Math.sin(i / 5 + 2) * 10 + (Math.random() - 0.5) * 4).toFixed(1),
      rainfall: +(Math.max(0, Math.sin(i / 6) * 3 + (Math.random() - 0.7) * 2)).toFixed(1),
    };
  });
}
