import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FIELDS } from "@/lib/farm-data";
import { toast } from "sonner";
import { History, RotateCcw, Save, Sparkles } from "lucide-react";

export const Route = createFileRoute("/thresholds")({
  component: ThresholdsPage,
  head: () => ({ meta: [{ title: "Thresholds · Verdant" }] }),
});

const DEFAULTS = { moisture: [25, 55] as [number, number], temp: [18, 30] as [number, number], humidity: [40, 75] as [number, number], ph: [6.0, 7.2] as [number, number] };

function ThresholdsPage() {
  const [field, setField] = useState(FIELDS[0].id);
  const [stage, setStage] = useState("Vegetative");
  const [moisture, setMoisture] = useState<number[]>(DEFAULTS.moisture);
  const [temp, setTemp] = useState<number[]>(DEFAULTS.temp);
  const [humidity, setHumidity] = useState<number[]>(DEFAULTS.humidity);
  const [ph, setPh] = useState<number[]>([60, 72]); // 6.0-7.2 *10
  const [autoAdjust, setAutoAdjust] = useState(true);
  const [dirty, setDirty] = useState(false);

  const onChange = (setter: (v: number[]) => void) => (v: number[]) => { setter(v); setDirty(true); };

  const reset = () => {
    setMoisture(DEFAULTS.moisture); setTemp(DEFAULTS.temp);
    setHumidity(DEFAULTS.humidity); setPh([60, 72]); setDirty(true);
    toast.info("Reset to crop defaults");
  };

  const save = () => {
    setDirty(false);
    toast.success("Threshold profile saved", { description: "Version added to history · audit logged" });
  };

  const selected = FIELDS.find((f) => f.id === field)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Threshold Manager</h1>
          <p className="text-muted-foreground">Crop-aware ranges with AI auto-adjustment</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"><History className="h-4 w-4" /> Version history</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={reset}><RotateCcw className="h-4 w-4" /> Reset</Button>
          <Button size="sm" className="gap-2" onClick={save} disabled={!dirty}>
            <Save className="h-4 w-4" /> Save profile
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-2 text-sm">
          You have unsaved changes.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Field</Label>
              <Select value={field} onValueChange={(v) => { setField(v); setDirty(true); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELDS.map((f) => <SelectItem key={f.id} value={f.id}>{f.name} · {f.crop}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Growth stage</Label>
              <Select value={stage} onValueChange={(v) => { setStage(v); setDirty(true); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Germination", "Vegetative", "Flowering", "Fruiting", "Mature"].map((s) =>
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Crop</Label>
              <div className="flex h-10 items-center px-3 rounded-md border bg-muted/40 text-sm">
                {selected.crop}
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-4 border-t">
            <RangeRow label="Soil moisture" unit="%" min={0} max={100} step={1} value={moisture} onChange={onChange(setMoisture)} />
            <RangeRow label="Temperature" unit="°C" min={0} max={45} step={1} value={temp} onChange={onChange(setTemp)} />
            <RangeRow label="Humidity" unit="%" min={0} max={100} step={1} value={humidity} onChange={onChange(setHumidity)} />
            <RangeRow label="pH" unit="" min={40} max={90} step={1} value={ph} onChange={onChange(setPh)} format={(v) => (v / 10).toFixed(1)} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-display font-semibold">AI auto-adjust</h3>
                <p className="text-xs text-muted-foreground">Tunes ranges using climate forecast &amp; growth stage</p>
              </div>
              <Switch checked={autoAdjust} onCheckedChange={(v) => { setAutoAdjust(v); setDirty(true); }} />
            </div>
            {autoAdjust && (
              <div className="rounded-lg bg-accent/40 p-3 text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-accent-foreground font-medium">
                  <Sparkles className="h-3.5 w-3.5" /> Active adjustments
                </div>
                <p className="text-muted-foreground">
                  Moisture floor raised by <strong>+4%</strong> due to forecast heatwave. Temp ceiling unchanged.
                </p>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-semibold mb-3">Recent versions</h3>
            <div className="space-y-2 text-sm">
              {[
                { v: "v12", date: "Today, 09:14", by: "Amara T.", current: true },
                { v: "v11", date: "Yesterday", by: "AI auto-adjust" },
                { v: "v10", date: "3 days ago", by: "Marcus K." },
              ].map((r) => (
                <div key={r.v} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{r.v} {r.current && <Badge variant="secondary" className="ml-1 text-[10px]">current</Badge>}</p>
                    <p className="text-xs text-muted-foreground">{r.date} · {r.by}</p>
                  </div>
                  {!r.current && <Button variant="ghost" size="sm" className="h-7 text-xs">Restore</Button>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RangeRow({
  label, unit, min, max, step, value, onChange, format,
}: {
  label: string; unit: string; min: number; max: number; step: number;
  value: number[]; onChange: (v: number[]) => void;
  format?: (n: number) => string;
}) {
  const fmt = format ?? ((n: number) => n.toString());
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2 text-sm font-mono tabular-nums">
          <span className="px-2 py-0.5 rounded bg-muted">{fmt(value[0])}{unit}</span>
          <span className="text-muted-foreground">→</span>
          <span className="px-2 py-0.5 rounded bg-muted">{fmt(value[1])}{unit}</span>
        </div>
      </div>
      <Slider min={min} max={max} step={step} value={value} onValueChange={onChange} />
    </div>
  );
}
