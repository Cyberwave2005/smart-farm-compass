-- Verdant farm dashboard: core tables + RLS for read-only public access via Supabase anon key.
-- Apply with: supabase db push   OR   paste into SQL Editor in the Supabase dashboard.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.fields (
  id text primary key,
  name text not null,
  crop text not null,
  stage text not null,
  area_ha numeric(10, 2) not null,
  health smallint not null check (health between 0 and 100),
  moisture smallint not null,
  temp smallint not null,
  humidity smallint not null,
  ph numeric(4, 1) not null,
  status text not null check (status in ('healthy', 'warning', 'critical')),
  sort_order int not null default 0
);

create table if not exists public.alerts (
  id text primary key,
  level text not null check (level in ('critical', 'warning', 'info')),
  title text not null,
  field_label text not null,
  time_label text not null,
  resolved boolean not null default false,
  sort_order int not null default 0
);

create table if not exists public.recommendations (
  id text primary key,
  type text not null check (type in ('irrigation', 'fertilizer', 'disease', 'climate')),
  field_name text not null,
  crop text not null,
  title text not null,
  reason text not null,
  confidence numeric(4, 3) not null check (confidence >= 0 and confidence <= 1),
  sort_order int not null default 0
);

create table if not exists public.devices (
  id text primary key,
  name text not null,
  type text not null check (type in ('moisture', 'weather', 'ph', 'valve', 'camera')),
  field_label text not null,
  status text not null check (status in ('online', 'offline', 'degraded')),
  last_seen_label text not null,
  latency_ms int not null default 0,
  sort_order int not null default 0
);

create table if not exists public.webhook_events (
  id text primary key,
  source text not null,
  status text not null check (status in ('success', 'failed', 'retry')),
  ts_label text not null,
  latency_ms int not null,
  sort_order int not null default 0
);

create index if not exists fields_sort_order_idx on public.fields (sort_order);
create index if not exists alerts_sort_order_idx on public.alerts (sort_order);
create index if not exists recommendations_sort_order_idx on public.recommendations (sort_order);
create index if not exists devices_sort_order_idx on public.devices (sort_order);
create index if not exists webhook_events_sort_order_idx on public.webhook_events (sort_order);

-- ---------------------------------------------------------------------------
-- Row Level Security (read for anon + authenticated API roles)
-- ---------------------------------------------------------------------------

alter table public.fields enable row level security;
alter table public.alerts enable row level security;
alter table public.recommendations enable row level security;
alter table public.devices enable row level security;
alter table public.webhook_events enable row level security;

drop policy if exists "Allow public read fields" on public.fields;
drop policy if exists "Allow public read alerts" on public.alerts;
drop policy if exists "Allow public read recommendations" on public.recommendations;
drop policy if exists "Allow public read devices" on public.devices;
drop policy if exists "Allow public read webhook_events" on public.webhook_events;

create policy "Allow public read fields"
  on public.fields for select
  using (true);

create policy "Allow public read alerts"
  on public.alerts for select
  using (true);

create policy "Allow public read recommendations"
  on public.recommendations for select
  using (true);

create policy "Allow public read devices"
  on public.devices for select
  using (true);

create policy "Allow public read webhook_events"
  on public.webhook_events for select
  using (true);

grant select on public.fields to anon, authenticated;
grant select on public.alerts to anon, authenticated;
grant select on public.recommendations to anon, authenticated;
grant select on public.devices to anon, authenticated;
grant select on public.webhook_events to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed data (matches former in-app mock data)
-- ---------------------------------------------------------------------------

insert into public.fields (id, name, crop, stage, area_ha, health, moisture, temp, humidity, ph, status, sort_order)
values
  ('f1', 'UZ North Research Plot', 'Maize', 'Vegetative', 12.4, 92, 38, 24, 64, 6.5, 'healthy', 1),
  ('f2', 'Mukuvisi Irrigation Block', 'Tomato', 'Flowering', 5.8, 76, 22, 28, 55, 6.8, 'warning', 2),
  ('f3', 'Mt Pleasant Greenhouse', 'Lettuce', 'Mature', 1.2, 88, 52, 21, 72, 6.2, 'healthy', 3),
  ('f4', 'Avondale Citrus Orchard', 'Citrus', 'Fruiting', 8.0, 64, 18, 31, 41, 6.9, 'critical', 4),
  ('f5', 'Ruwa Grain Block', 'Wheat', 'Heading', 18.6, 81, 34, 26, 58, 7.0, 'healthy', 5)
on conflict (id) do update set
  name = excluded.name,
  crop = excluded.crop,
  stage = excluded.stage,
  area_ha = excluded.area_ha,
  health = excluded.health,
  moisture = excluded.moisture,
  temp = excluded.temp,
  humidity = excluded.humidity,
  ph = excluded.ph,
  status = excluded.status,
  sort_order = excluded.sort_order;

insert into public.alerts (id, level, title, field_label, time_label, resolved, sort_order)
values
  ('a1', 'critical', 'Soil moisture below 20% threshold', 'Avondale Citrus Orchard', '2 min ago', false, 1),
  ('a2', 'warning', 'Temperature trending high', 'Mukuvisi Irrigation Block', '14 min ago', false, 2),
  ('a3', 'warning', 'pH drift detected', 'Mt Pleasant Greenhouse', '1 hr ago', false, 3),
  ('a4', 'info', 'Rain forecast within 24h', 'All fields', '2 hr ago', false, 4),
  ('a5', 'critical', 'Sensor offline > 30 min', 'UZ North Research Plot', '3 hr ago', true, 5)
on conflict (id) do update set
  level = excluded.level,
  title = excluded.title,
  field_label = excluded.field_label,
  time_label = excluded.time_label,
  resolved = excluded.resolved,
  sort_order = excluded.sort_order;

insert into public.recommendations (id, type, field_name, crop, title, reason, confidence, sort_order)
values
  (
    'r1',
    'irrigation',
    'Avondale Citrus Orchard',
    'Citrus',
    'Irrigate 18mm within 4 hours',
    'Moisture at 18% — 6pts below stage threshold. Forecast: no rain, 31°C peak.',
    0.940,
    1
  ),
  (
    'r2',
    'fertilizer',
    'Mukuvisi Irrigation Block',
    'Tomato',
    'Apply potassium-rich foliar feed',
    'Flowering stage + leaf yellowing pattern. Past 14d nutrient draw 22% above baseline.',
    0.810,
    2
  ),
  (
    'r3',
    'disease',
    'Mt Pleasant Greenhouse',
    'Lettuce',
    'Monitor for downy mildew',
    'Humidity 72% sustained 6h, temp 18-22°C — matches infection model.',
    0.670,
    3
  ),
  (
    'r4',
    'climate',
    'UZ North Research Plot',
    'Maize',
    'Auto-raised moisture floor to 32%',
    'Heatwave forecast (3 days >30°C). Adjusted threshold for vegetative stage.',
    0.880,
    4
  )
on conflict (id) do update set
  type = excluded.type,
  field_name = excluded.field_name,
  crop = excluded.crop,
  title = excluded.title,
  reason = excluded.reason,
  confidence = excluded.confidence,
  sort_order = excluded.sort_order;

insert into public.devices (id, name, type, field_label, status, last_seen_label, latency_ms, sort_order)
values
  ('d1', 'UZ-SoilProbe-N1', 'moisture', 'UZ North Research Plot', 'online', '12s ago', 120, 1),
  ('d2', 'WeatherStation-A', 'weather', 'All fields', 'online', '8s ago', 95, 2),
  ('d3', 'Mukuvisi-pH-R3', 'ph', 'Mukuvisi Irrigation Block', 'degraded', '3m ago', 820, 3),
  ('d4', 'Avondale-Valve-E1', 'valve', 'Avondale Citrus Orchard', 'online', '1m ago', 210, 4),
  ('d5', 'Ruwa-SoilProbe-W2', 'moisture', 'Ruwa Grain Block', 'offline', '32m ago', 0, 5),
  ('d6', 'MtPleasant-Cam-S1', 'camera', 'Mt Pleasant Greenhouse', 'online', '45s ago', 340, 6)
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  field_label = excluded.field_label,
  status = excluded.status,
  last_seen_label = excluded.last_seen_label,
  latency_ms = excluded.latency_ms,
  sort_order = excluded.sort_order;

insert into public.webhook_events (id, source, status, ts_label, latency_ms, sort_order)
values
  ('w0', 'sensor.moisture', 'success', '1s ago', 142, 0),
  ('w1', 'sensor.temp', 'success', '4s ago', 201, 1),
  ('w2', 'weather.api', 'success', '7s ago', 98, 2),
  ('w3', 'valve.state', 'failed', '10s ago', 310, 3),
  ('w4', 'camera.snapshot', 'success', '13s ago', 256, 4),
  ('w5', 'sensor.moisture', 'success', '16s ago', 167, 5),
  ('w6', 'sensor.temp', 'success', '19s ago', 189, 6),
  ('w7', 'weather.api', 'retry', '22s ago', 420, 7),
  ('w8', 'valve.state', 'success', '25s ago', 133, 8),
  ('w9', 'camera.snapshot', 'success', '28s ago', 278, 9),
  ('w10', 'sensor.moisture', 'success', '31s ago', 151, 10),
  ('w11', 'sensor.temp', 'success', '34s ago', 224, 11)
on conflict (id) do update set
  source = excluded.source,
  status = excluded.status,
  ts_label = excluded.ts_label,
  latency_ms = excluded.latency_ms,
  sort_order = excluded.sort_order;
