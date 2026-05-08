import { createFileRoute } from "@tanstack/react-router";
import { LiveChart, RainfallChart } from "@/components/dashboard/live-chart";

export const Route = createFileRoute("/analytics")({
  component: () => (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Historical trends and climate correlations</p>
      </div>
      <LiveChart />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RainfallChart />
        <RainfallChart />
      </div>
    </div>
  ),
  head: () => ({ meta: [{ title: "Analytics · Verdant" }] }),
});
