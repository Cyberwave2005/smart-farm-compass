import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line,
} from "recharts";
import { useEffect, useState } from "react";
import { generateMultiSeries } from "@/lib/farm-data";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

export function LiveChart() {
  const [data, setData] = useState(() => generateMultiSeries(24));
  const [last, setLast] = useState("just now");

  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => {
        const next = [...prev.slice(1)];
        const t = new Date();
        const lastV = prev[prev.length - 1];
        next.push({
          time: `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`,
          moisture: clamp(lastV.moisture + (Math.random() - 0.5) * 2, 10, 60),
          temp: clamp(lastV.temp + (Math.random() - 0.5) * 1.2, 15, 38),
          humidity: clamp(lastV.humidity + (Math.random() - 0.5) * 3, 30, 90),
          rainfall: Math.max(0, lastV.rainfall + (Math.random() - 0.7) * 1.5),
        });
        return next;
      });
      setLast("just now");
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-semibold text-lg">Live Sensor Stream</h3>
          <p className="text-sm text-muted-foreground">Aggregated readings · last 24h</p>
        </div>
        <Badge variant="outline" className="gap-1.5 border-success/30 text-success">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-success pulse-dot" />
            <span className="relative h-2 w-2 rounded-full bg-success" />
          </span>
          Live · {last}
        </Badge>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -10, right: 10, top: 5 }}>
            <defs>
              <linearGradient id="moist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-info)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-info)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="temp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-warning)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-warning)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 8, fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="moisture" stroke="var(--color-info)" fill="url(#moist)" strokeWidth={2} name="Moisture %" />
            <Area type="monotone" dataKey="temp" stroke="var(--color-warning)" fill="url(#temp)" strokeWidth={2} name="Temp °C" />
            <Area type="monotone" dataKey="humidity" stroke="var(--color-primary)" fill="transparent" strokeWidth={2} name="Humidity %" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function RainfallChart() {
  const [data] = useState(() => generateMultiSeries(14));
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold">Rainfall · 14 day trend</h3>
          <p className="text-sm text-muted-foreground">mm precipitation</p>
        </div>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -10, right: 10 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 8, fontSize: 12,
              }}
            />
            <Line type="monotone" dataKey="rainfall" stroke="var(--color-secondary)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function clamp(n: number, min: number, max: number) {
  return +Math.max(min, Math.min(max, n)).toFixed(1);
}
