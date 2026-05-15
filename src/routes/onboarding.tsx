import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Leaf, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth, type UserActuator } from "@/context/auth-context";
import type { FarmNode } from "@/lib/farm-data";
import { openMeteoSearchPlaces, type GeocodeHit } from "@/lib/open-meteo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
  head: () => ({ meta: [{ title: "Welcome · Verdant" }] }),
});

const ACTUATOR_TYPES = [
  { value: "valve", label: "Irrigation valve" },
  { value: "pump", label: "Pump" },
  { value: "fan", label: "Ventilation fan" },
  { value: "gate", label: "Gate / shutter" },
  { value: "irrigation", label: "Irrigation controller" },
  { value: "other", label: "Other actuator" },
] as const;

const NODE_ROLES: { value: FarmNode["role"]; label: string }[] = [
  { value: "gateway", label: "Gateway" },
  { value: "sensor_hub", label: "Sensor hub" },
  { value: "controller", label: "Controller" },
  { value: "edge", label: "Edge device" },
  { value: "other", label: "Other" },
];

type FarmRowDraft = {
  name: string;
  geoQuery: string;
  geoHits: GeocodeHit[];
  weather_lat: number | null;
  weather_lon: number | null;
  weather_label: string | null;
};

type NodeRowDraft = { farmIndex: number; name: string; role: FarmNode["role"]; notes: string };

type ActuatorRowDraft = {
  farmIndex: number;
  name: string;
  actuator_type: UserActuator["actuator_type"];
  field_or_location: string;
  notes: string;
};

function emptyFarm(): FarmRowDraft {
  return {
    name: "",
    geoQuery: "",
    geoHits: [],
    weather_lat: null,
    weather_lon: null,
    weather_label: null,
  };
}

function OnboardingPage() {
  const { supabase, user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [farmCount, setFarmCount] = useState(1);
  const [farms, setFarms] = useState<FarmRowDraft[]>([emptyFarm()]);
  const [nodes, setNodes] = useState<NodeRowDraft[]>([]);
  const [actuators, setActuators] = useState<ActuatorRowDraft[]>([
    { farmIndex: 0, name: "", actuator_type: "valve", field_or_location: "", notes: "" },
  ]);
  const [geoLoading, setGeoLoading] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const syncFarmRowsToCount = useCallback((next: number) => {
    const n = Math.max(1, Math.min(20, next));
    setFarms((prev) => {
      if (prev.length === n) return prev;
      if (prev.length < n) {
        return [...prev, ...Array.from({ length: n - prev.length }, () => emptyFarm())];
      }
      return prev.slice(0, n);
    });
    setNodes((prev) => prev.filter((x) => x.farmIndex < n));
    setActuators((prev) => prev.map((a) => (a.farmIndex >= n ? { ...a, farmIndex: n - 1 } : a)));
  }, []);

  useEffect(() => {
    syncFarmRowsToCount(farmCount);
  }, [farmCount, syncFarmRowsToCount]);

  async function searchGeo(farmIdx: number) {
    const q = farms[farmIdx]?.geoQuery?.trim();
    if (!q || q.length < 2) {
      toast.message("Type at least 2 characters to search for a place.");
      return;
    }
    setGeoLoading(farmIdx);
    try {
      const hits = await openMeteoSearchPlaces(q);
      setFarms((rows) => rows.map((r, i) => (i === farmIdx ? { ...r, geoHits: hits } : r)));
      if (!hits.length) toast.message("No places found. Try a nearby town or region.");
    } catch {
      toast.error("Location search failed.");
    } finally {
      setGeoLoading(null);
    }
  }

  function pickGeoHit(farmIdx: number, hit: GeocodeHit) {
    const label = [hit.name, hit.admin1, hit.country].filter(Boolean).join(", ");
    setFarms((rows) =>
      rows.map((r, i) =>
        i === farmIdx
          ? {
              ...r,
              weather_lat: hit.latitude,
              weather_lon: hit.longitude,
              weather_label: label,
              geoHits: [],
            }
          : r,
      ),
    );
  }

  function validateStep1(): boolean {
    for (let i = 0; i < farms.length; i++) {
      if (!farms[i]?.name?.trim()) {
        toast.error(`Farm ${i + 1}: enter a name.`);
        return false;
      }
    }
    return true;
  }

  async function persistWorkspace() {
    if (!supabase || !user) return;
    setSaving(true);
    try {
      const { error: delAct } = await supabase.from("user_actuators").delete().eq("user_id", user.id);
      if (delAct) {
        toast.error(delAct.message);
        return;
      }
      const { error: delFarm } = await supabase.from("farms").delete().eq("user_id", user.id);
      if (delFarm) {
        toast.error(delFarm.message);
        return;
      }

      const farmPayload = farms.map((f, i) => ({
        user_id: user.id,
        name: f.name.trim(),
        sort_order: i,
        weather_lat: f.weather_lat,
        weather_lon: f.weather_lon,
        weather_label: f.weather_label,
      }));

      const { data: insertedFarms, error: insFarmErr } = await supabase.from("farms").insert(farmPayload).select("id");
      if (insFarmErr || !insertedFarms?.length) {
        toast.error(insFarmErr?.message ?? "Could not save farms.");
        return;
      }

      const plotRows = insertedFarms.map((row) => ({
        farm_id: row.id,
        user_id: user.id,
        name: "Main plot",
        crop: "",
        stage: "",
        area_ha: 0,
        health: 0,
        moisture: 0,
        temp: 0,
        humidity: 0,
        ph: 7,
        status: "healthy" as const,
        sort_order: 0,
      }));
      const { error: plotErr } = await supabase.from("farm_plots").insert(plotRows);
      if (plotErr) {
        toast.error(plotErr.message);
        return;
      }

      const validNodes = nodes.filter((n) => n.name.trim() && n.farmIndex >= 0 && n.farmIndex < insertedFarms.length);
      if (validNodes.length) {
        const nodePayload = validNodes.map((n, i) => ({
          farm_id: insertedFarms[n.farmIndex]!.id,
          user_id: user.id,
          name: n.name.trim(),
          node_role: n.role,
          connectivity_notes: n.notes.trim() || null,
          sort_order: i,
        }));
        const { error: nodeErr } = await supabase.from("farm_nodes").insert(nodePayload);
        if (nodeErr) {
          toast.error(nodeErr.message);
          return;
        }
      }

      const validActuators = actuators.filter((a) => a.name.trim());
      if (validActuators.length) {
        const actPayload = validActuators.map((a, i) => ({
          user_id: user.id,
          farm_id: insertedFarms[a.farmIndex]?.id ?? null,
          name: a.name.trim(),
          actuator_type: a.actuator_type,
          field_or_location: a.field_or_location.trim() || null,
          notes: a.notes.trim() || null,
          sort_order: i,
        }));
        const { error: actErr } = await supabase.from("user_actuators").insert(actPayload);
        if (actErr) {
          toast.error(actErr.message);
          return;
        }
      }

      const { error: upErr } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      await refreshProfile();
      toast.success("Workspace saved.");
      await navigate({ to: "/" });
    } finally {
      setSaving(false);
    }
  }

  async function finishOnboarding(skipHardware: boolean) {
    if (!supabase || !user) return;
    if (!skipHardware) {
      if (!validateStep1()) return;
      await persistWorkspace();
      return;
    }
    setSaving(true);
    try {
      const { error: delAct } = await supabase.from("user_actuators").delete().eq("user_id", user.id);
      if (delAct) {
        toast.error(delAct.message);
        return;
      }
      const { error: delFarm } = await supabase.from("farms").delete().eq("user_id", user.id);
      if (delFarm) {
        toast.error(delFarm.message);
        return;
      }
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      await refreshProfile();
      toast.success("You can add farms and devices later from Settings in the sidebar.");
      await navigate({ to: "/" });
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-md">
            <Leaf className="h-6 w-6" />
          </div>
        </div>
        <h1 className="font-display text-3xl font-bold">
          Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          Set up your farms, optional weather location (Open-Meteo), edge nodes, and actuators. The dashboard only shows data you save here—no sample farm names.
        </p>
      </div>

      <div className="flex justify-center gap-2 text-xs font-medium">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={
              step === s
                ? "rounded-full bg-primary px-3 py-1 text-primary-foreground"
                : "rounded-full bg-muted px-3 py-1 text-muted-foreground"
            }
          >
            {s === 1 ? "Farms" : s === 2 ? "Nodes" : "Actuators"}
          </span>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Farms</CardTitle>
            <CardDescription>How many farms do you run? Name each one and optionally pin a place for weather.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 max-w-xs">
              <Label>Number of farms</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={farmCount}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  if (!Number.isFinite(raw)) return;
                  setFarmCount(Math.max(1, Math.min(20, raw)));
                }}
              />
            </div>

            {farms.map((row, idx) => (
              <div key={idx} className="rounded-xl border p-4 space-y-4 bg-muted/20">
                <p className="text-sm font-medium text-muted-foreground">Farm {idx + 1}</p>
                <div className="space-y-2">
                  <Label>Farm name</Label>
                  <Input
                    placeholder="e.g. Home block, North orchard"
                    value={row.name}
                    onChange={(e) =>
                      setFarms((r) => r.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> Weather location (optional)
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="City, region, or landmark"
                      value={row.geoQuery}
                      onChange={(e) =>
                        setFarms((r) => r.map((x, i) => (i === idx ? { ...x, geoQuery: e.target.value } : x)))
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0"
                      disabled={geoLoading === idx}
                      onClick={() => void searchGeo(idx)}
                    >
                      {geoLoading === idx ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                    </Button>
                  </div>
                  {row.geoHits.length > 0 && (
                    <ul className="rounded-lg border bg-background text-sm divide-y max-h-40 overflow-y-auto">
                      {row.geoHits.map((h) => (
                        <li key={h.id}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-muted/60"
                            onClick={() => pickGeoHit(idx, h)}
                          >
                            {[h.name, h.admin1, h.country].filter(Boolean).join(", ")}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {row.weather_label && (
                    <p className="text-xs text-muted-foreground">
                      Selected: <span className="text-foreground">{row.weather_label}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" onClick={() => validateStep1() && setStep(2)}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Nodes</CardTitle>
            <CardDescription>Register gateways, sensor hubs, or controllers for each farm (optional).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {nodes.length === 0 && (
              <p className="text-sm text-muted-foreground">No nodes yet. Add one below, or continue to actuators.</p>
            )}
            {nodes.map((row, idx) => (
              <div key={idx} className="rounded-xl border p-4 space-y-3 bg-muted/20">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Node {idx + 1}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setNodes((n) => n.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Farm</Label>
                    <Select
                      value={String(row.farmIndex)}
                      onValueChange={(v) =>
                        setNodes((n) => n.map((x, i) => (i === idx ? { ...x, farmIndex: Number(v) } : x)))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {farms.map((f, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {f.name.trim() || `Farm ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={row.role}
                      onValueChange={(v) =>
                        setNodes((n) => n.map((x, i) => (i === idx ? { ...x, role: v as FarmNode["role"] } : x)))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NODE_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Node name</Label>
                    <Input
                      placeholder="e.g. Shed gateway"
                      value={row.name}
                      onChange={(e) =>
                        setNodes((n) => n.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Connectivity notes (optional)</Label>
                    <Textarea
                      rows={2}
                      placeholder="LoRa, Wi-Fi SSID, SIM ICCID…"
                      value={row.notes}
                      onChange={(e) =>
                        setNodes((n) => n.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x)))
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => setNodes((n) => [...n, { farmIndex: 0, name: "", role: "gateway", notes: "" }])}
            >
              <Plus className="h-4 w-4" />
              Add node
            </Button>
            <div className="flex justify-between gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button type="button" onClick={() => setStep(3)}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Actuators</CardTitle>
            <CardDescription>Link pumps, valves, or fans to a farm (optional).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {actuators.map((row, idx) => (
              <div key={idx} className="rounded-xl border p-4 space-y-3 bg-muted/20">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Actuator {idx + 1}</span>
                  {actuators.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActuators((r) => r.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Farm</Label>
                    <Select
                      value={String(row.farmIndex)}
                      onValueChange={(v) =>
                        setActuators((r) => r.map((x, i) => (i === idx ? { ...x, farmIndex: Number(v) } : x)))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {farms.map((f, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {f.name.trim() || `Farm ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={row.actuator_type}
                      onValueChange={(v) =>
                        setActuators((r) =>
                          r.map((x, i) => (i === idx ? { ...x, actuator_type: v as UserActuator["actuator_type"] } : x)),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTUATOR_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="e.g. North block main valve"
                      value={row.name}
                      onChange={(e) =>
                        setActuators((r) => r.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Field / location note (optional)</Label>
                    <Input
                      placeholder="e.g. Block A drip line"
                      value={row.field_or_location}
                      onChange={(e) =>
                        setActuators((r) => r.map((x, i) => (i === idx ? { ...x, field_or_location: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      rows={2}
                      placeholder="GPIO pin, cloud device id…"
                      value={row.notes}
                      onChange={(e) =>
                        setActuators((r) => r.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x)))
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() =>
                setActuators((r) => [...r, { farmIndex: 0, name: "", actuator_type: "valve", field_or_location: "", notes: "" }])
              }
            >
              <Plus className="h-4 w-4" />
              Add actuator
            </Button>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end flex-1">
                <Button type="button" variant="ghost" disabled={saving} onClick={() => void finishOnboarding(true)}>
                  Skip setup
                </Button>
                <Button type="button" disabled={saving} onClick={() => void finishOnboarding(false)}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save workspace & dashboard"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
