-- Per-user notifications for the workspace dashboard (top nav bell + alerts list).

create table if not exists public.user_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  level text not null check (level in ('critical', 'warning', 'info')),
  title text not null,
  field_label text not null default '',
  time_label text not null,
  resolved boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists user_alerts_user_sort_idx on public.user_alerts (user_id, sort_order);

alter table public.user_alerts enable row level security;

drop policy if exists "user_alerts_select_own" on public.user_alerts;
drop policy if exists "user_alerts_insert_own" on public.user_alerts;
drop policy if exists "user_alerts_update_own" on public.user_alerts;
drop policy if exists "user_alerts_delete_own" on public.user_alerts;

create policy "user_alerts_select_own" on public.user_alerts for select using (auth.uid() = user_id);
create policy "user_alerts_insert_own" on public.user_alerts for insert with check (auth.uid() = user_id);
create policy "user_alerts_update_own" on public.user_alerts for update using (auth.uid() = user_id);
create policy "user_alerts_delete_own" on public.user_alerts for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_alerts to authenticated;
