import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEVICES, WEBHOOK_EVENTS } from "@/lib/farm-data";
import { Cpu, Wifi, WifiOff, AlertCircle, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeviceHealth() {
  const online = DEVICES.filter((d) => d.status === "online").length;
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold">Device Health</h3>
          <p className="text-xs text-muted-foreground">{online}/{DEVICES.length} online</p>
        </div>
        <Cpu className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        {DEVICES.map((d) => {
          const Icon = d.status === "online" ? Wifi : d.status === "offline" ? WifiOff : AlertCircle;
          const color =
            d.status === "online" ? "text-success"
            : d.status === "offline" ? "text-destructive" : "text-warning-foreground";
          return (
            <div key={d.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <Icon className={cn("h-4 w-4 shrink-0", color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.name}</p>
                <p className="text-xs text-muted-foreground truncate">{d.field} · {d.lastSeen}</p>
              </div>
              <Badge variant="outline" className="text-xs font-mono shrink-0">
                {d.latencyMs ? `${d.latencyMs}ms` : "—"}
              </Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function WebhookLog() {
  const statusIcon = {
    success: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
    failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
    retry: <RotateCcw className="h-3.5 w-3.5 text-warning-foreground" />,
  };
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold">Webhook Events</h3>
          <p className="text-xs text-muted-foreground">Latest 12 deliveries</p>
        </div>
        <Badge variant="outline" className="border-success/30 text-success">98.4% success</Badge>
      </div>
      <div className="space-y-1.5 font-mono text-xs">
        {WEBHOOK_EVENTS.map((e) => (
          <div key={e.id} className="flex items-center gap-2 py-1.5 border-b last:border-0">
            {statusIcon[e.status]}
            <span className="text-muted-foreground w-16 shrink-0">{e.ts}</span>
            <span className="flex-1 truncate">{e.source}</span>
            <span className="text-muted-foreground tabular-nums">{e.latency}ms</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
