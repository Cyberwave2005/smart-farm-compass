import { useQuery } from "@tanstack/react-query";
import { Cloud, Droplets, Thermometer, Wind } from "lucide-react";

import { useFarmData } from "@/context/farm-data-context";
import { Card } from "@/components/ui/card";
import { openMeteoForecast7d, weatherCodeLabel } from "@/lib/open-meteo";

function formatMm(mm: number): string {
  if (mm <= 0) return "0";
  if (mm < 10) return mm.toFixed(1);
  return String(Math.round(mm));
}

export function WeatherCard() {
  const { farms } = useFarmData();
  const loc = farms.find((f) => f.weather_lat != null && f.weather_lon != null);
  const lat = loc?.weather_lat ?? null;
  const lon = loc?.weather_lon ?? null;

  const q = useQuery({
    queryKey: ["open-meteo-forecast-7d", lat, lon],
    queryFn: () => openMeteoForecast7d(lat!, lon!),
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
          Search and pick a place for at least one farm (Manage my farm or onboarding) to show live weather from
          Open-Meteo.
        </p>
      </Card>
    );
  }

  const weekPrecipMm = q.data?.daily.reduce((a, d) => a + d.precipitationMm, 0) ?? 0;

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
        <>
          <p className="text-xs text-muted-foreground mt-3 text-center sm:text-left">
            {weatherCodeLabel(q.data.current.weatherCode)}
            {q.data.current.isDay === false ? " · Night" : ""}
          </p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-lg border bg-background/60 p-2">
              <p className="text-xl font-semibold tabular-nums">{Math.round(q.data.current.temperatureC)}°C</p>
              <p className="text-[10px] text-muted-foreground">Air temp.</p>
            </div>
            <div className="rounded-lg border bg-background/60 p-2 flex flex-col items-center justify-center gap-0.5">
              <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-sm font-semibold tabular-nums">{Math.round(q.data.current.apparentTemperatureC)}°C</p>
              <p className="text-[10px] text-muted-foreground">Feels like</p>
            </div>
            <div className="rounded-lg border bg-background/60 p-2 flex flex-col items-center justify-center gap-0.5">
              <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-sm font-semibold tabular-nums">{Math.round(q.data.current.humidityPct)}%</p>
              <p className="text-[10px] text-muted-foreground">Humidity</p>
            </div>
            <div className="rounded-lg border bg-background/60 p-2 flex flex-col items-center justify-center gap-0.5">
              <Wind className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-sm font-semibold tabular-nums">{Math.round(q.data.current.windKmh)}</p>
              <p className="text-[10px] text-muted-foreground">Wind km/h</p>
            </div>
          </div>

          {q.data.daily.length > 0 && (
            <div className="mt-5 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">7-day snapshot</p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  Week rain ≈ {formatMm(weekPrecipMm)} mm
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {q.data.daily.map((d) => (
                  <div
                    key={d.dateIso}
                    className="rounded-lg border bg-background/50 px-2 py-2 text-center text-xs space-y-1"
                  >
                    <p className="font-medium text-foreground">{d.weekdayShort}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">{d.dateIso.slice(5)}</p>
                    <p className="tabular-nums font-semibold text-foreground">
                      {Math.round(d.tempMinC)}° / {Math.round(d.tempMaxC)}°
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">{formatMm(d.precipitationMm)} mm</p>
                    <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                      {weatherCodeLabel(d.weatherCode)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <p className="text-[10px] text-muted-foreground mt-3">
        Powered by{" "}
        <a
          className="underline underline-offset-2 hover:text-foreground"
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
        >
          Open-Meteo
        </a>{" "}
        · no API key required
      </p>
    </Card>
  );
}
