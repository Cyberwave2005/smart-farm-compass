import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Leaf, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth, type UserActuator } from "@/context/auth-context";
import { FALLBACK_FIELDS } from "@/lib/farm-data";
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

function OnboardingPage() {
  const { supabase, user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<
    { name: string; actuator_type: UserActuator["actuator_type"]; field_or_location: string; notes: string }[]
  >([{ name: "", actuator_type: "valve", field_or_location: "", notes: "" }]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadActuators = useCallback(async () => {
    if (!supabase || !user) return;
    setLoadingList(true);
    const { data, error } = await supabase
      .from("user_actuators")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });
    setLoadingList(false);
    if (error) {
      console.error(error);
      return;
    }
    if (data?.length) {
      setRows(
        data.map((r) => ({
          name: r.name,
          actuator_type: r.actuator_type as UserActuator["actuator_type"],
          field_or_location: r.field_or_location ?? "",
          notes: r.notes ?? "",
        })),
      );
    }
  }, [supabase, user]);

  useEffect(() => {
    void loadActuators();
  }, [loadActuators]);

  async function finishOnboarding(skipActuators: boolean) {
    if (!supabase || !user) return;
    setSaving(true);
    try {
      if (!skipActuators) {
        const { error: delErr } = await supabase.from("user_actuators").delete().eq("user_id", user.id);
        if (delErr) {
          toast.error(delErr.message);
          return;
        }
        const valid = rows.filter((r) => r.name.trim());
        if (valid.length) {
          const inserts = valid.map((r, i) => ({
            user_id: user.id,
            name: r.name.trim(),
            actuator_type: r.actuator_type,
            field_or_location: r.field_or_location.trim() || null,
            notes: r.notes.trim() || null,
            sort_order: i,
          }));
          const { error: insErr } = await supabase.from("user_actuators").insert(inserts);
          if (insErr) {
            toast.error(insErr.message);
            return;
          }
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
      toast.success("You are all set.");
      await navigate({ to: "/" });
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-md">
            <Leaf className="h-6 w-6" />
          </div>
        </div>
        <h1 className="font-display text-3xl font-bold">Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}</h1>
        <p className="text-muted-foreground">
          Register the actuators you control—valves, pumps, fans—so Verdant can align automations with your farm layout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Your actuators</CardTitle>
          <CardDescription>Add one row per device. You can edit these later from Settings (coming soon).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingList ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            rows.map((row, idx) => (
              <div key={idx} className="rounded-xl border p-4 space-y-3 bg-muted/20">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Actuator {idx + 1}</span>
                  {rows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setRows((r) => r.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="e.g. North block main valve"
                      value={row.name}
                      onChange={(e) =>
                        setRows((r) => r.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={row.actuator_type}
                      onValueChange={(v) =>
                        setRows((r) =>
                          r.map((x, i) =>
                            i === idx ? { ...x, actuator_type: v as UserActuator["actuator_type"] } : x,
                          ),
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
                  <div className="space-y-2">
                    <Label>Field / location</Label>
                    <Input
                      list={`onboarding-field-suggestions-${idx}`}
                      placeholder="e.g. UZ North Research Plot"
                      value={row.field_or_location}
                      onChange={(e) =>
                        setRows((r) => r.map((x, i) => (i === idx ? { ...x, field_or_location: e.target.value } : x)))
                      }
                    />
                    <datalist id={`onboarding-field-suggestions-${idx}`}>
                      {FALLBACK_FIELDS.map((f) => (
                        <option key={f.id} value={f.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      rows={2}
                      placeholder="GPIO pin, cloud device id, valve zone…"
                      value={row.notes}
                      onChange={(e) =>
                        setRows((r) => r.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x)))
                      }
                    />
                  </div>
                </div>
              </div>
            ))
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() =>
              setRows((r) => [...r, { name: "", actuator_type: "valve", field_or_location: "", notes: "" }])
            }
          >
            <Plus className="h-4 w-4" />
            Add another actuator
          </Button>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={() => void finishOnboarding(true)}>
              Skip for now
            </Button>
            <Button type="button" disabled={saving} onClick={() => void finishOnboarding(false)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & go to dashboard"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
