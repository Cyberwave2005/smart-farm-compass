import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "info" | "warning" | "destructive" | "success" | "muted";

const toneMap: Record<Tone, string> = {
  primary: "text-primary bg-primary/10",
  info: "text-info bg-info/10",
  warning: "text-warning bg-warning/15",
  destructive: "text-destructive bg-destructive/10",
  success: "text-success bg-success/10",
  muted: "text-muted-foreground bg-muted",
};

export function StatCard({
  label, value, delta, trend = "flat", icon: Icon, tone = "primary", suffix,
}: {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon: LucideIcon;
  tone?: Tone;
  suffix?: string;
}) {
  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
  const trendColor =
    trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground";

  return (
    <Card className="relative p-5 hover:shadow-elegant transition-shadow cursor-pointer group overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-3xl font-bold tabular-nums">{value}</span>
            {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
          </div>
          {delta && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              {delta}
            </div>
          )}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
