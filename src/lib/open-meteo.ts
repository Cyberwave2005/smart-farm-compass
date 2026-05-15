/** Open-Meteo (no API key). Safe to call from the browser. */

export type GeocodeHit = {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

export async function openMeteoSearchPlaces(query: string): Promise<GeocodeHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: GeocodeHit[] };
  return json.results ?? [];
}

export type CurrentWeather = {
  temperatureC: number;
  humidityPct: number;
  windKmh: number;
  weatherCode: number;
  isDay: boolean;
};

/** Current conditions + 7-day daily stats from hourly series (Open-Meteo v1 forecast). */
export type MeteoDailyStatistics = {
  dateIso: string;
  weekdayShort: string;
  tempMinC: number;
  tempMaxC: number;
  /** Sum of hourly precipitation for that local calendar day (mm). */
  precipitationMm: number;
  /** Most frequent WMO weather code in that day’s hourly rows. */
  weatherCode: number;
};

export type MeteoForecast7d = {
  current: CurrentWeather & { apparentTemperatureC: number };
  daily: MeteoDailyStatistics[];
};

function dominantWeatherCode(codes: number[]): number {
  if (!codes.length) return 0;
  const counts = new Map<number, number>();
  for (const c of codes) counts.set(c, (counts.get(c) ?? 0) + 1);
  let best = codes[0]!;
  let bestN = 0;
  for (const [c, n] of counts) {
    if (n > bestN) {
      best = c;
      bestN = n;
    }
  }
  return best;
}

function weekdayShortFromDateIso(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateIso.slice(5);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function aggregateHourlyToDaily(
  times: string[],
  tempsC: number[],
  precipMm: number[],
  codes: number[],
): MeteoDailyStatistics[] {
  type Bucket = { temps: number[]; precips: number[]; codes: number[] };
  const buckets = new Map<string, Bucket>();
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (!t) continue;
    const day = t.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    let b = buckets.get(day);
    if (!b) {
      b = { temps: [], precips: [], codes: [] };
      buckets.set(day, b);
    }
    const temp = tempsC[i];
    if (temp !== undefined && Number.isFinite(temp)) b.temps.push(temp);
    const p = precipMm[i];
    if (p !== undefined && Number.isFinite(p)) b.precips.push(p);
    const c = codes[i];
    if (c !== undefined && Number.isFinite(c)) b.codes.push(Math.round(c));
  }
  const days = [...buckets.keys()].sort();
  return days.map((dateIso) => {
    const b = buckets.get(dateIso)!;
    const tempMinC = b.temps.length ? Math.min(...b.temps) : 0;
    const tempMaxC = b.temps.length ? Math.max(...b.temps) : 0;
    const precipitationMm = b.precips.reduce((a, x) => a + x, 0);
    return {
      dateIso,
      weekdayShort: weekdayShortFromDateIso(dateIso),
      tempMinC,
      tempMaxC,
      precipitationMm,
      weatherCode: dominantWeatherCode(b.codes),
    };
  });
}

/**
 * Forecast aligned with Open-Meteo’s public API: current + 7-day hourly, then rolled up to daily stats.
 * @see https://api.open-meteo.com/v1/forecast
 */
export async function openMeteoForecast7d(latitude: number, longitude: number): Promise<MeteoForecast7d | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code,is_day",
  );
  url.searchParams.set("hourly", "temperature_2m,precipitation,weather_code");
  url.searchParams.set("forecast_days", "7");

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const json = (await res.json()) as {
    current?: {
      temperature_2m?: number;
      relative_humidity_2m?: number;
      apparent_temperature?: number;
      wind_speed_10m?: number;
      weather_code?: number;
      is_day?: number;
    };
    hourly?: {
      time?: string[];
      temperature_2m?: number[];
      precipitation?: number[];
      weather_code?: number[];
    };
  };

  const c = json.current;
  if (!c || c.temperature_2m === undefined) return null;

  const times = json.hourly?.time ?? [];
  const temps = json.hourly?.temperature_2m ?? [];
  const precips = json.hourly?.precipitation ?? [];
  const codes = json.hourly?.weather_code ?? [];
  const daily = aggregateHourlyToDaily(times, temps, precips, codes);

  return {
    current: {
      temperatureC: c.temperature_2m,
      apparentTemperatureC: c.apparent_temperature ?? c.temperature_2m,
      humidityPct: c.relative_humidity_2m ?? 0,
      windKmh: c.wind_speed_10m ?? 0,
      weatherCode: c.weather_code ?? 0,
      isDay: Boolean(c.is_day),
    },
    daily,
  };
}

/** @deprecated Prefer {@link openMeteoForecast7d} for dashboard parity with 7-day stats. */
export async function openMeteoCurrent(latitude: number, longitude: number): Promise<CurrentWeather | null> {
  const bundle = await openMeteoForecast7d(latitude, longitude);
  if (!bundle) return null;
  const cur = bundle.current;
  return {
    temperatureC: cur.temperatureC,
    humidityPct: cur.humidityPct,
    windKmh: cur.windKmh,
    weatherCode: cur.weatherCode,
    isDay: cur.isDay,
  };
}

/** Short human label for WMO weather codes (subset). */
export function weatherCodeLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Storm";
  return "Weather";
}
