import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFarmData } from "@/context/farm-data-context";
import { Cpu, Wifi, WifiOff, AlertCircle, CheckCircle2, RotateCcw, XCircle, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeviceHealth() {
  const { devices, nodes, actuators } = useFarmData();
  const hardwareCount = nodes.length + actuators.length + devices.length;
  const online = nodes.length + actuators.length + devices.filter((d) => d.status === "online").length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold">Hardware</h3>
          <p className="text-xs text-muted-foreground">
            {hardwareCount === 0
              ? "No nodes or actuators registered"
              : `${online} / ${hardwareCount} shown as reachable (nodes & actuators assumed online until telemetry lands)`}
          </p>
        </div>
        <Cpu className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        {nodes.map((n) => (
          <div key={n.id} className="flex items-center gap-3 py-2 border-b last:border-0">
            <Radio className="h-4 w-4 shrink-0 text-success" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{n.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {n.farmName} · {n.role.replace("_", " ")}
              </p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              node
            </Badge>
          </div>
        ))}
        {actuators.map((a) => (
          <div key={a.id} className="flex items-center gap-3 py-2 border-b last:border-0">
            <Wifi className="h-4 w-4 shrink-0 text-success" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{a.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {(a.farm_name ?? "Unassigned farm") + " · " + a.actuator_type}
              </p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              actuator
            </Badge>
          </div>
        ))}
        {devices.map((d) => {
          const Icon = d.status === "online" ? Wifi : d.status === "offline" ? WifiOff : AlertCircle;
          const color =
            d.status === "online"
              ? "text-success"
              : d.status === "offline"
                ? "text-destructive"
                : "text-warning-foreground";
          return (
            <div key={d.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <Icon className={cn("h-4 w-4 shrink-0", color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {d.field} · {d.lastSeen}
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono shrink-0">
                {d.latencyMs ? `${d.latencyMs}ms` : "—"}
              </Badge>
            </div>
          );
        })}
        {hardwareCount === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">Nothing registered yet. Use onboarding to add nodes and actuators.</p>
        )}
      </div>
    </Card>
  );
}

export function WebhookLog() {
  const { webhookEvents } = useFarmData();
  const statusIcon = {
    success: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
    failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
    retry: <RotateCcw className="h-3.5 w-3.5 text-warning-foreground" />,
  };
  const successRate =
    webhookEvents.length > 0
      ? Math.round(
          (webhookEvents.filter((e) => e.status === "success").length / webhookEvents.length) * 1000,
        ) / 10
      : null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold">Webhook Events</h3>
          <p className="text-xs text-muted-foreground">
            {webhookEvents.length ? `Latest ${webhookEvents.length} deliveries` : "No deliveries yet"}
          </p>
        </div>
        {successRate != null && (
          <Badge variant="outline" className="border-success/30 text-success">
            {successRate}% success
          </Badge>
        )}
      </div>
      {webhookEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Ingest webhooks will appear here once configured.</p>
      ) : (
        <div className="space-y-1.5 font-mono text-xs">
          {webhookEvents.map((e) => (
            <div key={e.id} className="flex items-center gap-2 py-1.5 border-b last:border-0">
              {statusIcon[e.status]}
              <span className="text-muted-foreground w-16 shrink-0">{e.ts}</span>
              <span className="flex-1 truncate">{e.source}</span>
              <span className="text-muted-foreground tabular-nums">{e.latency}ms</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
