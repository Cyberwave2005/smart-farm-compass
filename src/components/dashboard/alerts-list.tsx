import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, AlertOctagon, Check } from "lucide-react";
import { useFarmData } from "@/context/farm-data-context";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const cfg = {
  critical: { Icon: AlertOctagon, color: "text-destructive", bg: "bg-destructive/10", border: "border-l-destructive" },
  warning: { Icon: AlertTriangle, color: "text-warning-foreground", bg: "bg-warning/15", border: "border-l-warning" },
  info: { Icon: Info, color: "text-info", bg: "bg-info/10", border: "border-l-info" },
};

export function AlertsList({ limit }: { limit?: number }) {
  const { alerts: alertsFromCtx } = useFarmData();
  const [resolvedLocal, setResolvedLocal] = useState<Record<string, boolean>>({});

  const alerts = useMemo(
    () => alertsFromCtx.map((a) => ({ ...a, resolved: a.resolved || Boolean(resolvedLocal[a.id]) })),
    [alertsFromCtx, resolvedLocal],
  );

  const visible = limit ? alerts.slice(0, limit) : alerts;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold">Active Alerts</h3>
          <p className="text-xs text-muted-foreground">Threshold &amp; AI rule violations</p>
        </div>
        <Badge variant="destructive">
          {alerts.filter((a) => !a.resolved && a.level === "critical").length} critical
        </Badge>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No alerts. Your workspace feed is clear.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((a) => {
            const c = cfg[a.level];
            const Icon = c.Icon;
            return (
              <div
                key={a.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border-l-4 bg-muted/30 p-3 transition-opacity",
                  c.border,
                  a.resolved && "opacity-50",
                )}
              >
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", c.bg)}>
                  <Icon className={cn("h-4 w-4", c.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.field} · {a.time}
                  </p>
                </div>
                {!a.resolved && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setResolvedLocal((p) => ({ ...p, [a.id]: true }))}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
