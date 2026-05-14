-- User workspace: farms, plots (crop blocks), nodes, weather coords. Replaces reliance on global demo `fields` for logged-in users.

-- ---------------------------------------------------------------------------
-- Farms (per user)
-- ---------------------------------------------------------------------------

create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  sort_order int not null default 0,
  weather_lat double precision,
  weather_lon double precision,
  weather_label text,
  created_at timestamptz not null default now()
);

create index if not exists farms_user_sort_idx on public.farms (user_id, sort_order);

-- ---------------------------------------------------------------------------
-- Plots / crop blocks (shown as "fields" on the dashboard)
-- ---------------------------------------------------------------------------

create table if not exists public.farm_plots (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  crop text not null default '',
  stage text not null default '',
  area_ha numeric(10, 2) not null default 0,
  health smallint not null default 0 check (health between 0 and 100),
  moisture smallint not null default 0,
  temp smallint not null default 0,
  humidity smallint not null default 0,
  ph numeric(4, 1) not null default 7.0,
  status text not null default 'healthy' check (status in ('healthy', 'warning', 'critical')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists farm_plots_user_farm_idx on public.farm_plots (user_id, farm_id, sort_order);

-- ---------------------------------------------------------------------------
-- IoT / edge nodes
-- ---------------------------------------------------------------------------

create table if not exists public.farm_nodes (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  node_role text not null check (node_role in ('gateway', 'sensor_hub', 'controller', 'edge', 'other')),
  connectivity_notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists farm_nodes_user_farm_idx on public.farm_nodes (user_id, farm_id, sort_order);

-- ---------------------------------------------------------------------------
-- Actuators → optional link to farm
-- ---------------------------------------------------------------------------

alter table public.user_actuators
  add column if not exists farm_id uuid references public.farms (id) on delete set null;

create index if not exists user_actuators_farm_id_idx on public.user_actuators (farm_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.farms enable row level security;
alter table public.farm_plots enable row level security;
alter table public.farm_nodes enable row level security;

drop policy if exists "farms_select_own" on public.farms;
drop policy if exists "farms_insert_own" on public.farms;
drop policy if exists "farms_update_own" on public.farms;
drop policy if exists "farms_delete_own" on public.farms;

create policy "farms_select_own" on public.farms for select using (auth.uid() = user_id);
create policy "farms_insert_own" on public.farms for insert with check (auth.uid() = user_id);
create policy "farms_update_own" on public.farms for update using (auth.uid() = user_id);
create policy "farms_delete_own" on public.farms for delete using (auth.uid() = user_id);

drop policy if exists "farm_plots_select_own" on public.farm_plots;
drop policy if exists "farm_plots_insert_own" on public.farm_plots;
drop policy if exists "farm_plots_update_own" on public.farm_plots;
drop policy if exists "farm_plots_delete_own" on public.farm_plots;

create policy "farm_plots_select_own" on public.farm_plots for select using (auth.uid() = user_id);
create policy "farm_plots_insert_own" on public.farm_plots for insert with check (auth.uid() = user_id);
create policy "farm_plots_update_own" on public.farm_plots for update using (auth.uid() = user_id);
create policy "farm_plots_delete_own" on public.farm_plots for delete using (auth.uid() = user_id);

drop policy if exists "farm_nodes_select_own" on public.farm_nodes;
drop policy if exists "farm_nodes_insert_own" on public.farm_nodes;
drop policy if exists "farm_nodes_update_own" on public.farm_nodes;
drop policy if exists "farm_nodes_delete_own" on public.farm_nodes;

create policy "farm_nodes_select_own" on public.farm_nodes for select using (auth.uid() = user_id);
create policy "farm_nodes_insert_own" on public.farm_nodes for insert with check (auth.uid() = user_id);
create policy "farm_nodes_update_own" on public.farm_nodes for update using (auth.uid() = user_id);
create policy "farm_nodes_delete_own" on public.farm_nodes for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.farms to authenticated;
grant select, insert, update, delete on public.farm_plots to authenticated;
grant select, insert, update, delete on public.farm_nodes to authenticated;

-- ---------------------------------------------------------------------------
-- Actuator farm_id must belong to the same user (RLS tighten)
-- ---------------------------------------------------------------------------

drop policy if exists "actuators_insert_own" on public.user_actuators;
drop policy if exists "actuators_update_own" on public.user_actuators;

create policy "actuators_insert_own"
  on public.user_actuators for insert
  with check (
    auth.uid() = user_id
    and (
      farm_id is null
      or exists (select 1 from public.farms f where f.id = farm_id and f.user_id = auth.uid())
    )
  );

create policy "actuators_update_own"
  on public.user_actuators for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      farm_id is null
      or exists (select 1 from public.farms f where f.id = farm_id and f.user_id = auth.uid())
    )
  );
