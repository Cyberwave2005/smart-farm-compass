// In-process telemetry + integration config for dev and single-node deploys.
// For multi-instance production, persist events and mapping in a database or queue.

export type IntegrationSource = "arduino" | "google" | "generic";

export type TelemetryMapping = {
  /** Dot-paths to try for device / thing id (first non-empty wins) */
  deviceIdPaths: string[];
  moistureKeys: string[];
  temperatureKeys: string[];
  humidityKeys: string[];
  phKeys: string[];
  timestampKeys: string[];
};

export const DEFAULT_TELEMETRY_MAPPING: TelemetryMapping = {
  deviceIdPaths: ["device_id", "deviceId", "thing_id", "thingId", "id", "hardware_serial"],
  moistureKeys: ["soil_moisture", "moisture", "humidity_soil", "soilMoisture", "value"],
  temperatureKeys: ["temperature", "temp", "air_temperature", "value"],
  humidityKeys: ["humidity", "air_humidity", "relative_humidity", "value"],
  phKeys: ["ph", "soil_ph", "value"],
  timestampKeys: ["timestamp", "time", "ts", "created_at", "at"],
};

export type NormalizedTelemetry = {
  id: string;
  receivedAt: string;
  source: IntegrationSource;
  deviceId: string | null;
  moisture: number | null;
  temperature: number | null;
  humidity: number | null;
  ph: number | null;
  timestamp: string | null;
  raw: unknown;
};

export type IngestResult = {
  ok: boolean;
  normalized: NormalizedTelemetry;
  warnings: string[];
};

export type GoogleDocsLink = {
  documentId: string;
  label: string;
};

const MAX_EVENTS = 200;

let mapping: TelemetryMapping = { ...DEFAULT_TELEMETRY_MAPPING };
const events: NormalizedTelemetry[] = [];
let googleDocs: GoogleDocsLink | null = null;

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function firstNumberFromKeys(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    if (!(k in obj)) continue;
    const v = obj[k];
    const n = typeof v === "number" ? v : typeof v === "string" ? Number.parseFloat(v) : null;
    if (n != null && Number.isFinite(n)) return n;
  }
  return null;
}

function flattenArduinoVariable(obj: Record<string, unknown>): Record<string, unknown> {
  const variable = obj.variable;
  if (variable && typeof variable === "object" && !Array.isArray(variable)) {
    const v = variable as Record<string, unknown>;
    const name = typeof v.name === "string" ? v.name : "value";
    const val = v.value ?? v.last_value ?? v.val;
    return { ...obj, [name]: val };
  }
  return obj;
}

function coerceRecord(body: unknown): Record<string, unknown> | null {
  if (body == null) return null;
  if (typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  return null;
}

function inferSource(headers: Headers): IntegrationSource {
  const ua = (headers.get("user-agent") ?? "").toLowerCase();
  if (ua.includes("arduino") || headers.get("x-arduino-cloud")) return "arduino";
  if (headers.get("x-goog-channel-id") || headers.get("x-goog-resource-state")) return "google";
  return "generic";
}

function pickDeviceId(flat: Record<string, unknown>, paths: string[]): string | null {
  for (const path of paths) {
    const v = getByPath(flat, path);
    if (v != null && v !== "") return String(v);
  }
  return null;
}

function pickTimestamp(flat: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = flat[k];
    if (v == null) continue;
    if (typeof v === "number" && Number.isFinite(v)) {
      const ms = v < 1e12 ? v * 1000 : v;
      return new Date(ms).toISOString();
    }
    if (typeof v === "string") {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  return null;
}

export function getTelemetryMapping(): TelemetryMapping {
  return { ...mapping };
}

export function setTelemetryMapping(next: Partial<TelemetryMapping>): TelemetryMapping {
  mapping = {
    ...mapping,
    ...next,
    deviceIdPaths: next.deviceIdPaths ?? mapping.deviceIdPaths,
    moistureKeys: next.moistureKeys ?? mapping.moistureKeys,
    temperatureKeys: next.temperatureKeys ?? mapping.temperatureKeys,
    humidityKeys: next.humidityKeys ?? mapping.humidityKeys,
    phKeys: next.phKeys ?? mapping.phKeys,
    timestampKeys: next.timestampKeys ?? mapping.timestampKeys,
  };
  return { ...mapping };
}

export function resetTelemetryMapping(): TelemetryMapping {
  mapping = { ...DEFAULT_TELEMETRY_MAPPING };
  return { ...mapping };
}

export function getGoogleDocsLink(): GoogleDocsLink | null {
  return googleDocs ? { ...googleDocs } : null;
}

export function setGoogleDocsLink(next: GoogleDocsLink | null): GoogleDocsLink | null {
  googleDocs = next ? { ...next } : null;
  return googleDocs ? { ...googleDocs } : null;
}

export function listTelemetry(limit = 50): NormalizedTelemetry[] {
  const n = Math.min(Math.max(limit, 1), MAX_EVENTS);
  return events.slice(-n).reverse();
}

export function ingestPayload(raw: unknown, headers: Headers): IngestResult {
  const warnings: string[] = [];
  const source = inferSource(headers);
  const rec = coerceRecord(raw);
  if (!rec) {
    warnings.push("Body was not a JSON object; stored as raw only.");
  }
  const flat = rec ? flattenArduinoVariable(rec) : {};
  const m = mapping;

  const deviceId = rec ? pickDeviceId(flat, m.deviceIdPaths) : null;
  const timestamp = rec ? pickTimestamp(flat, m.timestampKeys) : null;

  let moisture = rec ? firstNumberFromKeys(flat, m.moistureKeys) : null;
  let temperature = rec ? firstNumberFromKeys(flat, m.temperatureKeys) : null;
  let humidity = rec ? firstNumberFromKeys(flat, m.humidityKeys) : null;
  let ph = rec ? firstNumberFromKeys(flat, m.phKeys) : null;

  if (rec && flat.variable && typeof flat.variable === "object") {
    const vname = String((flat.variable as Record<string, unknown>).name ?? "").toLowerCase();
    const vval = firstNumberFromKeys(flat, ["value"]);
    if (vname.includes("moist")) moisture = moisture ?? vval;
    else if (vname.includes("temp")) temperature = temperature ?? vval;
    else if (vname.includes("humid")) humidity = humidity ?? vval;
    else if (vname === "ph" || vname.includes("soil_ph")) ph = ph ?? vval;
  }

  if (moisture == null && temperature == null && humidity == null && ph == null && rec) {
    warnings.push("No numeric telemetry fields matched your mapping; adjust keys or paths.");
  }

  const normalized: NormalizedTelemetry = {
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: new Date().toISOString(),
    source,
    deviceId,
    moisture,
    temperature,
    humidity,
    ph,
    timestamp,
    raw,
  };

  events.push(normalized);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);

  return { ok: true, normalized, warnings };
}

export function exportDataModelSchema() {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    description: "Verdant field + telemetry schema for notebooks, Sheets, or Docs automation.",
    field: {
      id: "string",
      name: "string",
      crop: "string",
      stage: "string",
      areaHa: "number",
      health0to100: "number",
      moisturePct: "number",
      tempC: "number",
      humidityPct: "number",
      ph: "number",
      status: "healthy | warning | critical",
    },
    normalizedTelemetry: {
      id: "string",
      receivedAt: "iso8601",
      source: "arduino | google | generic",
      deviceId: "string | null",
      moisture: "number | null",
      temperature: "number | null",
      humidity: "number | null",
      ph: "number | null",
      timestamp: "iso8601 | null",
      raw: "object",
    },
    defaultMapping: DEFAULT_TELEMETRY_MAPPING,
  };
}
