import { createFileRoute } from "@tanstack/react-router";
import { DeviceHealth, WebhookLog } from "@/components/dashboard/device-health";

export const Route = createFileRoute("/devices")({
  component: () => (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Devices &amp; Webhooks</h1>
        <p className="text-muted-foreground">IoT health, latency, and event delivery</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DeviceHealth />
        <WebhookLog />
      </div>
    </div>
  ),
  head: () => ({ meta: [{ title: "Devices · Verdant" }] }),
});
