import { createFileRoute } from "@tanstack/react-router";
import {
  Sprout,
  Activity,
  Heart,
  Droplets,
  BellRing,
  Cpu,
  Clock,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { FieldCard } from "@/components/dashboard/field-card";
import { LiveChart, RainfallChart } from "@/components/dashboard/live-chart";
import { AIRecommendations } from "@/components/dashboard/ai-recommendations";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { DeviceHealth, WebhookLog } from "@/components/dashboard/device-health";
import { WeatherCard } from "@/components/dashboard/weather-card";
import { useFarmData } from "@/context/farm-data-context";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { AlertOctagon, X } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard · Verdant" },
      { name: "description", content: "Live overview of crop health, sensor readings, and AI recommendations." },
    ],
  }),
});

function Dashboard() {
  const { profile } = useAuth();
  const { fields, farms, alerts, nodes, actuators, webhookEvents } = useFarmData();
  const [bannerOpen, setBannerOpen] = useState(true);

  const firstName = profile?.display_name?.split(/\s+/)[0] ?? "there";

  const stats = useMemo(() => {
    const nFields = fields.length;
    const healthAvg =
      nFields > 0 ? Math.round(fields.reduce((a, f) => a + f.health, 0) / nFields) : 0;
    const moistureAvg =
      nFields > 0 ? Math.round(fields.reduce((a, f) => a + f.moisture, 0) / nFields) : 0;
    const criticalOpen = alerts.filter((a) => !a.resolved && a.level === "critical").length;
    const totalAlerts = alerts.filter((a) => !a.resolved).length;
    const hardware = nodes.length + actuators.length;
    const totalHa =
      nFields > 0 ? fields.reduce((a, f) => a + f.area, 0).toFixed(1) : "0";
    return {
      nFields,
      healthAvg,
      moistureAvg,
      criticalOpen,
      totalAlerts,
      hardware,
      totalHa,
    };
  }, [fields, alerts, nodes.length, actuators.length]);

  const topAlert = alerts.find((a) => !a.resolved && a.level === "critical");

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 md:p-8 text-white shadow-elegant">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs uppercase tracking-widest opacity-80 mb-2">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Good morning, {firstName}</h1>
          <p className="text-sm md:text-base opacity-90 max-w-lg">
            {farms.length === 0 && fields.length === 0
              ? "You have not added farms or plots yet. Complete onboarding or add data in Supabase to see live cards here."
              : `${farms.length} farm${farms.length === 1 ? "" : "s"} · ${fields.length} plot${fields.length === 1 ? "" : "s"} monitored${
                  topAlert ? ` · ${topAlert.title}` : ""
                }.`}
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-20 top-4 h-32 w-32 rounded-full bg-primary-glow/30 blur-2xl" />
      </div>

      {topAlert && bannerOpen && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <AlertOctagon className="h-5 w-5 text-destructive shrink-0" />
          <p className="flex-1">
            <strong>Critical:</strong> {topAlert.title}
            <span className="text-muted-foreground"> · {topAlert.field}</span>
          </p>
          <Button size="sm" variant="outline" className="h-7">
            Review
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setBannerOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Total farms"
          value={farms.length}
          icon={Sprout}
          tone="primary"
          delta={farms.length ? "Your workspace" : "Add in onboarding"}
          trend="flat"
        />
        <StatCard
          label="Active plots"
          value={stats.nFields}
          icon={Activity}
          tone="info"
          delta={`${stats.totalHa} ha total`}
        />
        <StatCard
          label="Crop health"
          value={stats.healthAvg}
          suffix="/100"
          icon={Heart}
          tone="success"
          delta={stats.nFields ? "Plot average" : "No plots yet"}
          trend="flat"
        />
        <StatCard
          label="Soil moisture"
          value={stats.moistureAvg}
          suffix="% avg"
          icon={Droplets}
          tone="info"
          delta={stats.nFields ? "Plot average" : "—"}
          trend="flat"
        />
        <StatCard
          label="Active alerts"
          value={stats.totalAlerts}
          icon={BellRing}
          tone={stats.criticalOpen ? "destructive" : "success"}
          delta={stats.criticalOpen ? `${stats.criticalOpen} critical` : "None open"}
          trend="flat"
        />
        <StatCard
          label="Hardware"
          value={stats.hardware}
          icon={Cpu}
          tone="success"
          delta="Nodes + actuators"
        />
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Clock className="h-3 w-3" />
        {webhookEvents.length > 0 ? (
          <>
            Last webhook <strong className="text-foreground">{webhookEvents[0]?.ts ?? "—"}</strong> ·{" "}
            {webhookEvents[0]?.source ?? "—"}
          </>
        ) : (
          <>No webhook events recorded yet.</>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <WeatherCard />
          <LiveChart />

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">Live plot monitoring</h2>
            </div>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-8 text-center">
                No plots yet. Each farm you save in onboarding gets a starter plot; rename or split plots when plot
                management ships.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.slice(0, 4).map((f) => (
                  <FieldCard key={f.id} field={f} />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RainfallChart />
            <WebhookLog />
          </div>
        </div>

        <div className="space-y-6">
          <AIRecommendations />
          <AlertsList limit={4} />
          <DeviceHealth />
        </div>
      </div>
    </div>
  );
}
