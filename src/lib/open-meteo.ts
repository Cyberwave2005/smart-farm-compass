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

export async function openMeteoCurrent(latitude: number, longitude: number): Promise<CurrentWeather | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day");
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const json = (await res.json()) as {
    current?: {
      temperature_2m?: number;
      relative_humidity_2m?: number;
      weather_code?: number;
      wind_speed_10m?: number;
      is_day?: number;
    };
  };
  const c = json.current;
  if (!c || c.temperature_2m === undefined) return null;
  return {
    temperatureC: c.temperature_2m,
    humidityPct: c.relative_humidity_2m ?? 0,
    windKmh: c.wind_speed_10m ?? 0,
    weatherCode: c.weather_code ?? 0,
    isDay: Boolean(c.is_day),
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
