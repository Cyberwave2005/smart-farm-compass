import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Droplets, Thermometer, Wind, FlaskConical, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Field } from "@/lib/farm-data";

const statusStyles = {
  healthy: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

export function FieldCard({ field, onClick }: { field: Field; onClick?: () => void }) {
  return (
    <Card
      onClick={onClick}
      className="p-5 hover:shadow-elegant transition-all cursor-pointer hover:-translate-y-0.5 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <MapPin className="h-3 w-3" />
            {field.area} ha
          </div>
          <h3 className="font-display font-semibold text-lg">{field.name}</h3>
          <p className="text-sm text-muted-foreground">{field.crop} · {field.stage}</p>
        </div>
        <Badge variant="outline" className={cn("capitalize", statusStyles[field.status])}>
          <span className="relative flex h-1.5 w-1.5 mr-1.5">
            <span className={cn("absolute inset-0 rounded-full pulse-dot")} />
            <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
          </span>
          {field.status}
        </Badge>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Health score</span>
          <span className="font-semibold tabular-nums">{field.health}</span>
        </div>
        <Progress value={field.health} className="h-1.5" />
      </div>

      <div className="grid grid-cols-4 gap-2 pt-3 border-t">
        <SensorMini icon={Droplets} label="Moisture" value={`${field.moisture}%`} tone="info" />
        <SensorMini icon={Thermometer} label="Temp" value={`${field.temp}°`} tone="warning" />
        <SensorMini icon={Wind} label="Humidity" value={`${field.humidity}%`} tone="primary" />
        <SensorMini icon={FlaskConical} label="pH" value={field.ph.toFixed(1)} tone="muted" />
      </div>
    </Card>
  );
}

function SensorMini({
  icon: Icon, label, value, tone,
}: {
  icon: React.ElementType; label: string; value: string;
  tone: "info" | "warning" | "primary" | "muted";
}) {
  const colors = {
    info: "text-info", warning: "text-warning-foreground",
    primary: "text-primary", muted: "text-muted-foreground",
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon className={cn("h-3.5 w-3.5", colors[tone])} />
      <span className="text-xs font-semibold tabular-nums">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
