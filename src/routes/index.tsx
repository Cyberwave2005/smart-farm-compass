import { createFileRoute } from "@tanstack/react-router";
import {
  Sprout, Activity, Heart, Droplets, BellRing, Cpu, Clock,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { FieldCard } from "@/components/dashboard/field-card";
import { LiveChart, RainfallChart } from "@/components/dashboard/live-chart";
import { AIRecommendations } from "@/components/dashboard/ai-recommendations";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { DeviceHealth, WebhookLog } from "@/components/dashboard/device-health";
import { useFarmData } from "@/context/farm-data-context";
import { Button } from "@/components/ui/button";
import { AlertOctagon, X } from "lucide-react";
import { useState } from "react";

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
  const { fields } = useFarmData();
  const [bannerOpen, setBannerOpen] = useState(true);

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 md:p-8 text-white shadow-elegant">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs uppercase tracking-widest opacity-80 mb-2">University of Zimbabwe Agroecology Farm · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Good morning, Tariro
          </h1>
          <p className="text-sm md:text-base opacity-90 max-w-lg">
            5 fields under watch · 1 critical alert needs attention. AI suggests irrigating Avondale Citrus Orchard within 4 hours.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-20 top-4 h-32 w-32 rounded-full bg-primary-glow/30 blur-2xl" />
      </div>

      {bannerOpen && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <AlertOctagon className="h-5 w-5 text-destructive shrink-0" />
          <p className="flex-1">
            <strong>Critical:</strong> Avondale Citrus Orchard soil moisture at 18% — below threshold for fruiting stage.
          </p>
          <Button size="sm" variant="outline" className="h-7">Review</Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setBannerOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total farms" value={3} icon={Sprout} tone="primary" delta="+1 this season" trend="up" />
        <StatCard label="Active fields" value={5} icon={Activity} tone="info" delta="46 ha total" />
        <StatCard label="Crop health" value={82} suffix="/100" icon={Heart} tone="success" delta="+3.2%" trend="up" />
        <StatCard label="Soil moisture" value="34" suffix="% avg" icon={Droplets} tone="info" delta="-2.1%" trend="down" />
        <StatCard label="Active alerts" value={4} icon={BellRing} tone="destructive" delta="2 critical" trend="up" />
        <StatCard label="Devices online" value="11/12" icon={Cpu} tone="success" delta="91.6%" />
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Clock className="h-3 w-3" />
        Last webhook received <strong className="text-foreground">8 seconds ago</strong> · sensor.moisture from UZ-SoilProbe-N1
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LiveChart />

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">Live Field Monitoring</h2>
              <Button variant="ghost" size="sm">View all →</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.slice(0, 4).map((f) => (
                <FieldCard key={f.id} field={f} />
              ))}
            </div>
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
