import { createFileRoute } from "@tanstack/react-router";
import { AlertsList } from "@/components/dashboard/alerts-list";

export const Route = createFileRoute("/alerts")({
  component: () => (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Alerts</h1>
        <p className="text-muted-foreground">Threshold breaches and AI-detected anomalies</p>
      </div>
      <AlertsList />
    </div>
  ),
  head: () => ({ meta: [{ title: "Alerts · Verdant" }] }),
});
