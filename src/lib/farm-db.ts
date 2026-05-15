import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Alert,
  Device,
  FarmNode,
  FarmSnapshot,
  FarmSummary,
  Field,
  Recommendation,
  WebhookEvent,
  WorkspaceActuator,
} from "@/lib/farm-data";
import { EMPTY_FARM_SNAPSHOT, getStaticFarmSnapshot } from "@/lib/farm-data";
import { parsePlotThresholdProfile } from "@/lib/plot-thresholds";
import { createSupabaseServerClient, createSupabaseServerClientWithUserJwt } from "@/lib/supabase-server";

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

type FarmRow = {
  id: string;
  name: string;
  sort_order: number;
  weather_lat: number | null;
  weather_lon: number | null;
  weather_label: string | null;
};

type PlotRow = {
  id: string;
  farm_id: string;
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
  threshold_profile?: unknown;
  farms: { name: string } | null;
};

type NodeRow = {
  id: string;
  farm_id: string;
  name: string;
  node_role: FarmNode["role"];
  connectivity_notes: string | null;
  farmer_email: string | null;
  zapier_webhook_url: string | null;
  farms: { name: string } | null;
};

type ActuatorRow = {
  id: string;
  name: string;
  actuator_type: WorkspaceActuator["actuator_type"];
  field_or_location: string | null;
  notes: string | null;
  farm_id: string | null;
  farms: { name: string } | null;
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

function mapFarm(r: FarmRow): FarmSummary {
  return {
    id: r.id,
    name: r.name,
    weather_lat: r.weather_lat,
    weather_lon: r.weather_lon,
    weather_label: r.weather_label,
  };
}

function mapPlot(r: PlotRow): Field {
  const farmName = r.farms?.name ?? "";
  return {
    id: r.id,
    farmId: r.farm_id,
    farmName: farmName || undefined,
    name: farmName ? `${farmName} · ${r.name}` : r.name,
    crop: r.crop,
    stage: r.stage,
    area: Number(r.area_ha),
    health: r.health,
    moisture: r.moisture,
    temp: r.temp,
    humidity: r.humidity,
    ph: Number(r.ph),
    status: r.status,
    thresholdProfile: parsePlotThresholdProfile(r.threshold_profile),
  };
}

function mapNode(r: NodeRow): FarmNode | null {
  const farmName = r.farms?.name;
  if (!farmName) return null;
  return {
    id: r.id,
    farmId: r.farm_id,
    farmName,
    name: r.name,
    role: r.node_role,
    connectivityNotes: r.connectivity_notes,
    farmerEmail: r.farmer_email,
    zapierWebhookUrl: r.zapier_webhook_url,
  };
}

function mapWorkspaceActuator(r: ActuatorRow): WorkspaceActuator {
  return {
    id: r.id,
    name: r.name,
    actuator_type: r.actuator_type,
    field_or_location: r.field_or_location,
    notes: r.notes,
    farm_id: r.farm_id,
    farm_name: r.farms?.name ?? null,
  };
}

/** Legacy global demo tables (service role / anon without user JWT). */
export async function fetchGlobalFarmSnapshot(client: SupabaseClient): Promise<FarmSnapshot | null> {
  const [fieldsRes, alertsRes, recsRes, devicesRes, hooksRes] = await Promise.all([
    client.from("fields").select("*").order("sort_order", { ascending: true }),
    client.from("alerts").select("*").order("sort_order", { ascending: true }),
    client.from("recommendations").select("*").order("sort_order", { ascending: true }),
    client.from("devices").select("*").order("sort_order", { ascending: true }),
    client.from("webhook_events").select("*").order("sort_order", { ascending: true }),
  ]);

  if (fieldsRes.error || alertsRes.error || recsRes.error || devicesRes.error || hooksRes.error) {
    console.error(
      "Supabase global farm snapshot error",
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
    farms: [],
    nodes: [],
    actuators: [],
    fields,
    alerts,
    recommendations,
    devices,
    webhookEvents,
  };
}

/** Logged-in user workspace (`farms`, `farm_plots`, `farm_nodes`, `user_actuators`). */
export async function fetchUserWorkspaceSnapshot(client: SupabaseClient): Promise<FarmSnapshot | null> {
  const [farmsRes, plotsRes, nodesRes, actRes] = await Promise.all([
    client.from("farms").select("id,name,sort_order,weather_lat,weather_lon,weather_label").order("sort_order", { ascending: true }),
    client
      .from("farm_plots")
      .select("id,farm_id,name,crop,stage,area_ha,health,moisture,temp,humidity,ph,status,threshold_profile,farms(name)")
      .order("sort_order", { ascending: true }),
    client
      .from("farm_nodes")
      .select("id,farm_id,name,node_role,connectivity_notes,farmer_email,zapier_webhook_url,farms(name)")
      .order("sort_order", { ascending: true }),
    client
      .from("user_actuators")
      .select("id,name,actuator_type,field_or_location,notes,farm_id,farms(name)")
      .order("sort_order", { ascending: true }),
  ]);

  const firstErr = farmsRes.error ?? plotsRes.error ?? nodesRes.error ?? actRes.error;
  if (firstErr) {
    if (firstErr.code === "42P01" || firstErr.message?.includes("does not exist")) {
      console.warn("User workspace tables missing; apply latest Supabase migrations.");
      return null;
    }
    console.error("Supabase user workspace snapshot error", firstErr);
    return null;
  }

  const farms = (farmsRes.data as FarmRow[] | null)?.map(mapFarm) ?? [];
  const fields = (plotsRes.data as PlotRow[] | null)?.map(mapPlot) ?? [];
  const nodes = (nodesRes.data as NodeRow[] | null)?.flatMap((r) => {
    const n = mapNode(r);
    return n ? [n] : [];
  }) ?? [];
  const actuators = (actRes.data as ActuatorRow[] | null)?.map(mapWorkspaceActuator) ?? [];

  return {
    source: "workspace",
    farms,
    nodes,
    actuators,
    fields,
    alerts: [],
    recommendations: [],
    devices: [],
    webhookEvents: [],
  };
}

export async function loadFarmSnapshotForUser(accessToken: string): Promise<FarmSnapshot> {
  const client = createSupabaseServerClientWithUserJwt(accessToken);
  if (!client) {
    return { ...EMPTY_FARM_SNAPSHOT, source: "workspace" };
  }
  try {
    const snap = await fetchUserWorkspaceSnapshot(client);
    if (snap) return snap;
  } catch (e) {
    console.error(e);
  }
  return { ...EMPTY_FARM_SNAPSHOT, source: "workspace" };
}

/** Used when no user JWT is available (should be rare in this app). */
export async function loadFarmSnapshotWithFallback(): Promise<FarmSnapshot> {
  const client = createSupabaseServerClient();
  if (!client) {
    return getStaticFarmSnapshot();
  }
  try {
    const snap = await fetchGlobalFarmSnapshot(client);
    if (snap) return snap;
  } catch (e) {
    console.error(e);
  }
  return getStaticFarmSnapshot();
}
