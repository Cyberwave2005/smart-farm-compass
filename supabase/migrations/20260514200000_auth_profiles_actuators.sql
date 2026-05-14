-- Auth profiles + user actuators (onboarding). Run after core farm tables migration.

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_actuators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  actuator_type text not null check (actuator_type in ('valve', 'pump', 'fan', 'gate', 'irrigation', 'other')),
  field_or_location text,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists user_actuators_user_id_idx on public.user_actuators (user_id);
create index if not exists user_actuators_sort_idx on public.user_actuators (user_id, sort_order);

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_actuators enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "actuators_select_own" on public.user_actuators;
drop policy if exists "actuators_insert_own" on public.user_actuators;
drop policy if exists "actuators_update_own" on public.user_actuators;
drop policy if exists "actuators_delete_own" on public.user_actuators;

create policy "actuators_select_own"
  on public.user_actuators for select
  using (auth.uid() = user_id);

create policy "actuators_insert_own"
  on public.user_actuators for insert
  with check (auth.uid() = user_id);

create policy "actuators_update_own"
  on public.user_actuators for update
  using (auth.uid() = user_id);

create policy "actuators_delete_own"
  on public.user_actuators for delete
  using (auth.uid() = user_id);

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_actuators to authenticated;
