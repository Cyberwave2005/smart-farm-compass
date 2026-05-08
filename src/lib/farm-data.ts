// Mock data + simulated real-time generators for the farm dashboard.

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

export const FIELDS: Field[] = [
  { id: "f1", name: "North Plot", crop: "Maize", stage: "Vegetative", area: 12.4, health: 92, moisture: 38, temp: 24, humidity: 64, ph: 6.5, status: "healthy" },
  { id: "f2", name: "Riverside", crop: "Tomato", stage: "Flowering", area: 5.8, health: 76, moisture: 22, temp: 28, humidity: 55, ph: 6.8, status: "warning" },
  { id: "f3", name: "South Greenhouse", crop: "Lettuce", stage: "Mature", area: 1.2, health: 88, moisture: 52, temp: 21, humidity: 72, ph: 6.2, status: "healthy" },
  { id: "f4", name: "East Orchard", crop: "Apple", stage: "Fruiting", area: 8.0, health: 64, moisture: 18, temp: 31, humidity: 41, ph: 6.9, status: "critical" },
  { id: "f5", name: "West Paddock", crop: "Wheat", stage: "Heading", area: 18.6, health: 81, moisture: 34, temp: 26, humidity: 58, ph: 7.0, status: "healthy" },
];

export type Alert = {
  id: string;
  level: "critical" | "warning" | "info";
  title: string;
  field: string;
  time: string;
  resolved: boolean;
};

export const ALERTS: Alert[] = [
  { id: "a1", level: "critical", title: "Soil moisture below 20% threshold", field: "East Orchard", time: "2 min ago", resolved: false },
  { id: "a2", level: "warning", title: "Temperature trending high", field: "Riverside", time: "14 min ago", resolved: false },
  { id: "a3", level: "warning", title: "pH drift detected", field: "South Greenhouse", time: "1 hr ago", resolved: false },
  { id: "a4", level: "info", title: "Rain forecast within 24h", field: "All fields", time: "2 hr ago", resolved: false },
  { id: "a5", level: "critical", title: "Sensor offline > 30 min", field: "North Plot", time: "3 hr ago", resolved: true },
];

export type Recommendation = {
  id: string;
  type: "irrigation" | "fertilizer" | "disease" | "climate";
  field: string;
  crop: string;
  title: string;
  reason: string;
  confidence: number;
};

export const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "r1", type: "irrigation", field: "East Orchard", crop: "Apple",
    title: "Irrigate 18mm within 4 hours",
    reason: "Moisture at 18% — 6pts below stage threshold. Forecast: no rain, 31°C peak.",
    confidence: 0.94,
  },
  {
    id: "r2", type: "fertilizer", field: "Riverside", crop: "Tomato",
    title: "Apply potassium-rich foliar feed",
    reason: "Flowering stage + leaf yellowing pattern. Past 14d nutrient draw 22% above baseline.",
    confidence: 0.81,
  },
  {
    id: "r3", type: "disease", field: "South Greenhouse", crop: "Lettuce",
    title: "Monitor for downy mildew",
    reason: "Humidity 72% sustained 6h, temp 18-22°C — matches infection model.",
    confidence: 0.67,
  },
  {
    id: "r4", type: "climate", field: "North Plot", crop: "Maize",
    title: "Auto-raised moisture floor to 32%",
    reason: "Heatwave forecast (3 days >30°C). Adjusted threshold for vegetative stage.",
    confidence: 0.88,
  },
];

export type Device = {
  id: string;
  name: string;
  type: "moisture" | "weather" | "ph" | "valve" | "camera";
  field: string;
  status: "online" | "offline" | "degraded";
  lastSeen: string;
  latencyMs: number;
};

export const DEVICES: Device[] = [
  { id: "d1", name: "SoilProbe-N1", type: "moisture", field: "North Plot", status: "online", lastSeen: "12s ago", latencyMs: 120 },
  { id: "d2", name: "WeatherStation-A", type: "weather", field: "All fields", status: "online", lastSeen: "8s ago", latencyMs: 95 },
  { id: "d3", name: "pH-Probe-R3", type: "ph", field: "Riverside", status: "degraded", lastSeen: "3m ago", latencyMs: 820 },
  { id: "d4", name: "Valve-E1", type: "valve", field: "East Orchard", status: "online", lastSeen: "1m ago", latencyMs: 210 },
  { id: "d5", name: "SoilProbe-W2", type: "moisture", field: "West Paddock", status: "offline", lastSeen: "32m ago", latencyMs: 0 },
  { id: "d6", name: "Cam-South", type: "camera", field: "South Greenhouse", status: "online", lastSeen: "45s ago", latencyMs: 340 },
];

export type WebhookEvent = {
  id: string;
  source: string;
  status: "success" | "failed" | "retry";
  ts: string;
  latency: number;
};

export const WEBHOOK_EVENTS: WebhookEvent[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `w${i}`,
  source: ["sensor.moisture", "sensor.temp", "weather.api", "valve.state", "camera.snapshot"][i % 5],
  status: i === 3 ? "failed" : i === 7 ? "retry" : "success",
  ts: `${i * 3 + 1}s ago`,
  latency: 80 + Math.round(Math.random() * 240),
}));

// Generate timeseries
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
