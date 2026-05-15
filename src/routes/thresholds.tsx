import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFarmData } from "@/context/farm-data-context";
import { useAuth } from "@/context/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, RotateCcw, Save, Sparkles } from "lucide-react";
import type { Field, PlotThresholdProfile } from "@/lib/farm-data";
import {
  DEFAULT_THRESHOLD_PROFILE,
  serializePlotThresholdProfile,
} from "@/lib/plot-thresholds";

export const Route = createFileRoute("/thresholds")({
  component: ThresholdsPage,
  head: () => ({ meta: [{ title: "Thresholds · Verdant" }] }),
});

function profileForField(f: Field | undefined): PlotThresholdProfile {
  if (!f) return { ...DEFAULT_THRESHOLD_PROFILE };
  if (f.thresholdProfile) return f.thresholdProfile;
  return {
    ...DEFAULT_THRESHOLD_PROFILE,
    growthStage: f.stage?.trim() ? f.stage : DEFAULT_THRESHOLD_PROFILE.growthStage,
  };
}

function ThresholdsPage() {
  const { supabase, session, user } = useAuth();
  const { fields, nodes, refetch } = useFarmData();
  const [plotId, setPlotId] = useState<string | null>(fields[0]?.id ?? null);
  const [moisture, setMoisture] = useState<number[]>(DEFAULT_THRESHOLD_PROFILE.moisture);
  const [temp, setTemp] = useState<number[]>(DEFAULT_THRESHOLD_PROFILE.temp);
  const [humidity, setHumidity] = useState<number[]>(DEFAULT_THRESHOLD_PROFILE.humidity);
  const [phTenths, setPhTenths] = useState<number[]>([60, 72]);
  const [growthStage, setGrowthStage] = useState(DEFAULT_THRESHOLD_PROFILE.growthStage);
  const [autoAdjust, setAutoAdjust] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nodeContacts, setNodeContacts] = useState<Record<string, { email: string; webhook: string }>>({});

  const fieldDataKey = useMemo(() => {
    const f = fields.find((x) => x.id === plotId);
    if (!f) return "";
    return [f.id, JSON.stringify(f.thresholdProfile ?? null), f.stage].join("::");
  }, [fields, plotId]);

  useEffect(() => {
    if (!fields.length) {
      setPlotId(null);
      return;
    }
    if (!plotId || !fields.some((f) => f.id === plotId)) {
      setPlotId(fields[0]!.id);
    }
  }, [fields, plotId]);

  useEffect(() => {
    const f = fields.find((x) => x.id === plotId);
    if (!f) return;
    const p = profileForField(f);
    setMoisture([...p.moisture]);
    setTemp([...p.temp]);
    setHumidity([...p.humidity]);
    setPhTenths([Math.round(p.ph[0] * 10), Math.round(p.ph[1] * 10)]);
    setGrowthStage(p.growthStage);
    setAutoAdjust(p.autoAdjust);
    setDirty(false);
  }, [fieldDataKey]);

  const selected = fields.find((f) => f.id === plotId);

  const nodeContactsKey = useMemo(
    () => nodes.map((n) => `${n.id}:${n.farmerEmail ?? ""}:${n.zapierWebhookUrl ?? ""}`).join("|"),
    [nodes],
  );

  useEffect(() => {
    const next: Record<string, { email: string; webhook: string }> = {};
    for (const n of nodes) {
      next[n.id] = { email: n.farmerEmail ?? "", webhook: n.zapierWebhookUrl ?? "" };
    }
    setNodeContacts(next);
  }, [nodeContactsKey]);

  const onRange = (setter: (v: number[]) => void) => (v: number[]) => {
    setter(v);
    setDirty(true);
  };

  const reset = () => {
    setMoisture([...DEFAULT_THRESHOLD_PROFILE.moisture]);
    setTemp([...DEFAULT_THRESHOLD_PROFILE.temp]);
    setHumidity([...DEFAULT_THRESHOLD_PROFILE.humidity]);
    setPhTenths([60, 72]);
    setGrowthStage(DEFAULT_THRESHOLD_PROFILE.growthStage);
    setAutoAdjust(DEFAULT_THRESHOLD_PROFILE.autoAdjust);
    setDirty(true);
    toast.info("Reset to crop defaults");
  };

  const save = useCallback(async () => {
    if (!supabase || !user || !plotId) {
      toast.error("Sign in and select a plot to save thresholds.");
      return;
    }
    setSaving(true);
    try {
      const profile: PlotThresholdProfile = {
        moisture: [moisture[0]!, moisture[1]!],
        temp: [temp[0]!, temp[1]!],
        humidity: [humidity[0]!, humidity[1]!],
        ph: [phTenths[0]! / 10, phTenths[1]! / 10],
        growthStage,
        autoAdjust,
      };

      const { error: plotErr } = await supabase
        .from("farm_plots")
        .update({
          threshold_profile: serializePlotThresholdProfile(profile),
          stage: growthStage,
        })
        .eq("id", plotId)
        .eq("user_id", user.id);

      if (plotErr) {
        toast.error(plotErr.message);
        return;
      }

      for (const n of nodes) {
        const patch = nodeContacts[n.id];
        if (!patch) continue;
        const { error: nodeErr } = await supabase
          .from("farm_nodes")
          .update({
            farmer_email: patch.email.trim() || null,
            zapier_webhook_url: patch.webhook.trim() || null,
          })
          .eq("id", n.id)
          .eq("user_id", user.id);
        if (nodeErr) {
          toast.error(nodeErr.message);
          return;
        }
      }

      setDirty(false);
      toast.success("Thresholds and alert routes saved.");
      refetch();
    } finally {
      setSaving(false);
    }
  }, [
    supabase,
    user,
    plotId,
    moisture,
    temp,
    humidity,
    phTenths,
    growthStage,
    autoAdjust,
    nodes,
    nodeContacts,
    refetch,
  ]);

  if (!session) {
    return (
      <div className="text-sm text-muted-foreground">
        Sign in to configure thresholds and Zapier routes.
      </div>
    );
  }

  if (!fields.length) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold">Thresholds</h1>
        <Card className="p-6 border-dashed">
          <p className="text-sm text-muted-foreground">
            Add farms and plots first (onboarding or Manage my farm). Thresholds are stored per plot in Supabase.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Threshold Manager</h1>
          <p className="text-muted-foreground">Plot ranges, growth stage, and per-node Zapier email routes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          <Button size="sm" className="gap-2" onClick={() => void save()} disabled={saving || !dirty}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm">
          You have unsaved changes.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Plot</Label>
              <Select
                value={plotId ?? ""}
                onValueChange={(v) => {
                  setPlotId(v);
                  setDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fields.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} · {f.crop || "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Growth stage</Label>
              <Select
                value={growthStage}
                onValueChange={(v) => {
                  setGrowthStage(v);
                  setDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Germination", "Vegetative", "Flowering", "Fruiting", "Mature"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Crop</Label>
              <div className="flex h-10 items-center px-3 rounded-md border bg-muted/40 text-sm">
                {selected?.crop ?? "—"}
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-4 border-t">
            <RangeRow
              label="Soil moisture"
              unit="%"
              min={0}
              max={100}
              step={1}
              value={moisture}
              onChange={onRange(setMoisture)}
            />
            <RangeRow
              label="Temperature"
              unit="°C"
              min={0}
              max={45}
              step={1}
              value={temp}
              onChange={onRange(setTemp)}
            />
            <RangeRow
              label="Humidity"
              unit="%"
              min={0}
              max={100}
              step={1}
              value={humidity}
              onChange={onRange(setHumidity)}
            />
            <RangeRow
              label="pH"
              unit=""
              min={40}
              max={90}
              step={1}
              value={phTenths}
              onChange={onRange(setPhTenths)}
              format={(v) => (v / 10).toFixed(1)}
            />
          </div>

          <div className="pt-6 border-t space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display font-semibold text-lg">Farmers and Zapier (per node)</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Add a Zapier <strong>Catch Hook</strong> URL for each node. In Zapier, map <code className="text-xs bg-muted px-1 rounded">farmer_email</code>,{" "}
              <code className="text-xs bg-muted px-1 rounded">title</code>, and <code className="text-xs bg-muted px-1 rounded">body</code> into an{" "}
              <strong>Email by Zapier</strong> step so each farmer gets tailored text. Use &quot;Send to Zapier&quot; on an AI recommendation to fire the
              webhook.
            </p>
            {nodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No nodes yet — add gateways or hubs under Manage my farm.</p>
            ) : (
              <div className="space-y-4">
                {nodes.map((n) => (
                  <div key={n.id} className="rounded-lg border p-4 space-y-3 bg-muted/20">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{n.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {n.farmName} · {n.role}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Farmer email (for Zapier mapping)</Label>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="farmer@example.com"
                          value={nodeContacts[n.id]?.email ?? ""}
                          onChange={(e) => {
                            setNodeContacts((prev) => ({
                              ...prev,
                              [n.id]: { email: e.target.value, webhook: prev[n.id]?.webhook ?? "" },
                            }));
                            setDirty(true);
                          }}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">Zapier webhook URL</Label>
                        <Input
                          type="url"
                          placeholder="https://hooks.zapier.com/hooks/catch/…"
                          value={nodeContacts[n.id]?.webhook ?? ""}
                          onChange={(e) => {
                            setNodeContacts((prev) => ({
                              ...prev,
                              [n.id]: { email: prev[n.id]?.email ?? "", webhook: e.target.value },
                            }));
                            setDirty(true);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-display font-semibold">AI auto-adjust</h3>
                <p className="text-xs text-muted-foreground">Preference stored with this plot (automation wiring comes next)</p>
              </div>
              <Switch
                checked={autoAdjust}
                onCheckedChange={(v) => {
                  setAutoAdjust(v);
                  setDirty(true);
                }}
              />
            </div>
            {autoAdjust && (
              <div className="rounded-lg bg-accent/40 p-3 text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-accent-foreground font-medium">
                  <Sparkles className="h-3.5 w-3.5" /> Enabled
                </div>
                <p className="text-muted-foreground">
                  When live climate + sensor rules are connected, Verdant can tune these floors and ceilings for the selected growth stage.
                </p>
              </div>
            )}
          </Card>

          <Card className="p-5 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground text-sm">Supabase columns</p>
            <p>
              Thresholds persist as <code className="bg-muted px-1 rounded">farm_plots.threshold_profile</code>. Node hooks use{" "}
              <code className="bg-muted px-1 rounded">farmer_email</code> and <code className="bg-muted px-1 rounded">zapier_webhook_url</code> on{" "}
              <code className="bg-muted px-1 rounded">farm_nodes</code>.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RangeRow({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  format,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number[];
  onChange: (v: number[]) => void;
  format?: (n: number) => string;
}) {
  const fmt = format ?? ((n: number) => n.toString());
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2 text-sm font-mono tabular-nums">
          <span className="px-2 py-0.5 rounded bg-muted">
            {fmt(value[0]!)}
            {unit}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="px-2 py-0.5 rounded bg-muted">
            {fmt(value[1]!)}
            {unit}
          </span>
        </div>
      </div>
      <Slider min={min} max={max} step={step} value={value} onValueChange={onChange} />
    </div>
  );
}
