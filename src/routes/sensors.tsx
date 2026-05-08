import { createFileRoute } from "@tanstack/react-router";
import { LiveChart } from "@/components/dashboard/live-chart";

export const Route = createFileRoute("/sensors")({
  component: () => (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Sensors</h1>
        <p className="text-muted-foreground">Live readings across all sensor channels</p>
      </div>
      <LiveChart />
    </div>
  ),
  head: () => ({ meta: [{ title: "Sensors · Verdant" }] }),
});
