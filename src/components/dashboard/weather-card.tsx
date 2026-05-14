import { useQuery } from "@tanstack/react-query";
import { Cloud, Droplets, Wind } from "lucide-react";

import { useFarmData } from "@/context/farm-data-context";
import { Card } from "@/components/ui/card";
import { openMeteoCurrent, weatherCodeLabel } from "@/lib/open-meteo";

export function WeatherCard() {
  const { farms } = useFarmData();
  const loc = farms.find((f) => f.weather_lat != null && f.weather_lon != null);
  const lat = loc?.weather_lat ?? null;
  const lon = loc?.weather_lon ?? null;

  const q = useQuery({
    queryKey: ["open-meteo-current", lat, lon],
    queryFn: () => openMeteoCurrent(lat!, lon!),
    enabled: lat != null && lon != null,
    staleTime: 10 * 60 * 1000,
  });

  if (!farms.length) {
    return (
      <Card className="p-4 md:p-5 border-dashed">
        <p className="text-sm text-muted-foreground">Add a farm during onboarding to attach a weather location.</p>
      </Card>
    );
  }

  if (lat == null || lon == null) {
    return (
      <Card className="p-4 md:p-5 border-dashed">
        <p className="text-sm text-muted-foreground">
          Search and pick a place for at least one farm (onboarding) to show live weather from Open-Meteo.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-5 bg-gradient-to-br from-sky-500/10 via-background to-background border-sky-500/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Live weather</p>
          <h3 className="font-display font-semibold text-lg mt-0.5">{loc?.name ?? "Farm"}</h3>
          <p className="text-xs text-muted-foreground mt-1">{loc?.weather_label ?? `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`}</p>
        </div>
        <Cloud className="h-8 w-8 text-sky-600 shrink-0" />
      </div>
      {q.isLoading && <p className="text-sm text-muted-foreground mt-3">Loading forecast…</p>}
      {q.isError && <p className="text-sm text-destructive mt-3">Could not load weather. Try again later.</p>}
      {q.data && (
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{Math.round(q.data.temperatureC)}°C</p>
            <p className="text-xs text-muted-foreground">{weatherCodeLabel(q.data.weatherCode)}</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-1">
            <Droplets className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium tabular-nums">{Math.round(q.data.humidityPct)}%</p>
            <p className="text-[10px] text-muted-foreground">Humidity</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-1">
            <Wind className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium tabular-nums">{Math.round(q.data.windKmh)}</p>
            <p className="text-[10px] text-muted-foreground">km/h wind</p>
          </div>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground mt-3">Powered by Open-Meteo · no API key required</p>
    </Card>
  );
}
