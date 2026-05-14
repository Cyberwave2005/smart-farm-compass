import type { SupabaseClient } from "@supabase/supabase-js";

import type { Alert, Device, Field, Recommendation, WebhookEvent, FarmSnapshot } from "@/lib/farm-data";
import { getStaticFarmSnapshot } from "@/lib/farm-data";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type { FarmSnapshot } from "@/lib/farm-data";

type FieldRow = {
  id: string;
  name: string;
  crop: string;
  stage: string;
  area_ha: number;
  health: number;
  moisture: number;
  temp: number;
  humidity: number;
  ph: number;
  status: Field["status"];
};

type AlertRow = {
  id: string;
  level: Alert["level"];
  title: string;
  field_label: string;
  time_label: string;
  resolved: boolean;
};

type RecommendationRow = {
  id: string;
  type: Recommendation["type"];
  field_name: string;
  crop: string;
  title: string;
  reason: string;
  confidence: number;
};

type DeviceRow = {
  id: string;
  name: string;
  type: Device["type"];
  field_label: string;
  status: Device["status"];
  last_seen_label: string;
  latency_ms: number;
};

type WebhookEventRow = {
  id: string;
  source: string;
  status: WebhookEvent["status"];
  ts_label: string;
  latency_ms: number;
};

function mapField(r: FieldRow): Field {
  return {
    id: r.id,
    name: r.name,
    crop: r.crop,
    stage: r.stage,
    area: Number(r.area_ha),
    health: r.health,
    moisture: r.moisture,
    temp: r.temp,
    humidity: r.humidity,
    ph: Number(r.ph),
    status: r.status,
  };
}

function mapAlert(r: AlertRow): Alert {
  return {
    id: r.id,
    level: r.level,
    title: r.title,
    field: r.field_label,
    time: r.time_label,
    resolved: r.resolved,
  };
}

function mapRecommendation(r: RecommendationRow): Recommendation {
  return {
    id: r.id,
    type: r.type,
    field: r.field_name,
    crop: r.crop,
    title: r.title,
    reason: r.reason,
    confidence: Number(r.confidence),
  };
}

function mapDevice(r: DeviceRow): Device {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    field: r.field_label,
    status: r.status,
    lastSeen: r.last_seen_label,
    latencyMs: r.latency_ms,
  };
}

function mapWebhook(r: WebhookEventRow): WebhookEvent {
  return {
    id: r.id,
    source: r.source,
    status: r.status,
    ts: r.ts_label,
    latency: r.latency_ms,
  };
}

export async function fetchFarmSnapshot(client: SupabaseClient): Promise<FarmSnapshot | null> {
  const [fieldsRes, alertsRes, recsRes, devicesRes, hooksRes] = await Promise.all([
    client.from("fields").select("*").order("sort_order", { ascending: true }),
    client.from("alerts").select("*").order("sort_order", { ascending: true }),
    client.from("recommendations").select("*").order("sort_order", { ascending: true }),
    client.from("devices").select("*").order("sort_order", { ascending: true }),
    client.from("webhook_events").select("*").order("sort_order", { ascending: true }),
  ]);

  if (fieldsRes.error || alertsRes.error || recsRes.error || devicesRes.error || hooksRes.error) {
    console.error(
      "Supabase farm snapshot error",
      fieldsRes.error ?? alertsRes.error ?? recsRes.error ?? devicesRes.error ?? hooksRes.error,
    );
    return null;
  }

  const fields = (fieldsRes.data as FieldRow[] | null)?.map(mapField) ?? [];
  const alerts = (alertsRes.data as AlertRow[] | null)?.map(mapAlert) ?? [];
  const recommendations = (recsRes.data as RecommendationRow[] | null)?.map(mapRecommendation) ?? [];
  const devices = (devicesRes.data as DeviceRow[] | null)?.map(mapDevice) ?? [];
  const webhookEvents = (hooksRes.data as WebhookEventRow[] | null)?.map(mapWebhook) ?? [];

  if (!fields.length) {
    return null;
  }

  return {
    source: "supabase",
    fields,
    alerts,
    recommendations,
    devices,
    webhookEvents,
  };
}

export async function loadFarmSnapshotWithFallback(): Promise<FarmSnapshot> {
  const client = createSupabaseServerClient();
  if (!client) {
    return getStaticFarmSnapshot();
  }
  try {
    const snap = await fetchFarmSnapshot(client);
    if (snap) return snap;
  } catch (e) {
    console.error(e);
  }
  return getStaticFarmSnapshot();
}
