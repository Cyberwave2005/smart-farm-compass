-- Follow-up: same Harare seed logic as 20260515220000 after it was updated to seed **every** user with zero farms.
-- Safe if 20260515220000 already ran on a new codebase; skips users who already have farms.
-- Also (re)defines my_workspace_counts() for checking counts while signed in.
--
-- Counts in SQL Editor: `select * from public.my_workspace_counts()` always returns (0,0) there because
-- there is no JWT — auth.uid() is null. Use this instead (postgres role, sees all rows):
--   select u.id, u.email, count(f.id)::bigint as farm_count
--   from auth.users u left join public.farms f on f.user_id = u.id
--   group by u.id, u.email order by farm_count asc, u.created_at desc;

alter table public.farm_plots add column if not exists threshold_profile jsonb;
alter table public.farm_nodes add column if not exists farmer_email text;
alter table public.farm_nodes add column if not exists zapier_webhook_url text;

create or replace function public.my_workspace_counts()
returns table(farm_count bigint, plot_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*)::bigint from public.farms where user_id = auth.uid()),
    (select count(*)::bigint from public.farm_plots where user_id = auth.uid());
$$;

grant execute on function public.my_workspace_counts() to authenticated;

do $$
declare
  r record;
  f1 uuid;
  f2 uuid;
  seeded int := 0;
begin
  for r in
    select u.id as user_id
    from auth.users u
    where not exists (select 1 from public.farms f where f.user_id = u.id)
    order by u.created_at asc
    limit 500
  loop
    insert into public.farms (user_id, name, sort_order, weather_lat, weather_lon, weather_label)
    values (
      r.user_id,
      'Borrowdale Orchards',
      0,
      -17.7412,
      31.0618,
      'Borrowdale, Harare, Zimbabwe'
    )
    returning id into f1;

    insert into public.farms (user_id, name, sort_order, weather_lat, weather_lon, weather_label)
    values (
      r.user_id,
      'Ruwa Packhouse & Fields',
      1,
      -17.8897,
      31.1489,
      'Ruwa, Mashonaland East, Zimbabwe'
    )
    returning id into f2;

    insert into public.farm_plots (
      farm_id,
      user_id,
      name,
      crop,
      stage,
      area_ha,
      health,
      moisture,
      temp,
      humidity,
      ph,
      status,
      sort_order,
      threshold_profile
    )
    values
      (
        f1,
        r.user_id,
        'North centre-pivot — Manager: Tinashe Moyo',
        'Maize',
        'Flowering',
        12.40,
        86,
        34,
        26,
        58,
        6.4,
        'healthy',
        0,
        '{"moisture":[28,52],"temp":[17,32],"humidity":[38,72],"ph":[6.1,6.9],"growthStage":"Flowering","autoAdjust":true}'::jsonb
      ),
      (
        f2,
        r.user_id,
        'Tunnel row A–D — Manager: Rudo Chikwava',
        'Tomato',
        'Fruiting',
        3.20,
        78,
        41,
        24,
        63,
        6.6,
        'warning',
        0,
        '{"moisture":[30,55],"temp":[18,30],"humidity":[45,78],"ph":[6.2,7.0],"growthStage":"Fruiting","autoAdjust":true}'::jsonb
      );

    insert into public.farm_nodes (farm_id, user_id, name, node_role, connectivity_notes, sort_order, farmer_email, zapier_webhook_url)
    values
      (
        f1,
        r.user_id,
        'Borrowdale shed gateway',
        'gateway',
        'Econet LTE primary · failover to farm Wi-Fi · on-call +263 77 210 4488 (Tinashe)',
        0,
        'tinashe.moyo@gmail.com',
        null
      ),
      (
        f1,
        r.user_id,
        'Block B LoRa soil mesh',
        'sensor_hub',
        '12× capacitance probes along drip line · Chisipite weather relay',
        1,
        null,
        null
      ),
      (
        f2,
        r.user_id,
        'Packhouse climate PLC',
        'controller',
        'Siemens LOGO! · temp/humidity for pack line 2 · mgr desk +263 77 334 9021 (Rudo)',
        0,
        'rudo.chikwava@gmail.com',
        null
      ),
      (
        f1,
        r.user_id,
        'Helensvale ridge weather kit',
        'sensor_hub',
        'Davis Vantage Pro2 · GSM failover to Borrowdale gateway',
        2,
        null,
        null
      ),
      (
        f2,
        r.user_id,
        'Cold store RTU logger',
        'edge',
        'LoRaWAN to packhouse PLC · battery + solar trickle',
        1,
        null,
        null
      );

    insert into public.user_alerts (user_id, level, title, field_label, time_label, resolved, sort_order)
    values
      (
        r.user_id,
        'warning',
        'Soil moisture edging low on pivot',
        'Borrowdale · North centre-pivot',
        '14 min ago',
        false,
        0
      ),
      (
        r.user_id,
        'info',
        'Light rain forecast tonight',
        'Ruwa Packhouse & Fields',
        '2 h ago',
        false,
        1
      ),
      (
        r.user_id,
        'info',
        'Cold store RTU joined mesh',
        'Ruwa · IoT',
        'Just now',
        true,
        2
      );

    insert into public.user_actuators (user_id, farm_id, name, actuator_type, field_or_location, notes, sort_order)
    values
      (
        r.user_id,
        f1,
        'North pivot master valve',
        'valve',
        'Borrowdale pivot P1 — north spar',
        '2" solenoid · last service Feb 2026',
        0
      ),
      (
        r.user_id,
        f2,
        'Borehole lift pump',
        'pump',
        'Ruwa borehole BH-2 (120 m)',
        '5.5 kW · float-linked to tank T3',
        1
      );

    seeded := seeded + 1;
  end loop;

  if seeded = 0 then
    raise notice 'seed_harare_followup: no users without farms; nothing inserted.';
  else
    raise notice 'seed_harare_followup: seeded Borrowdale + Ruwa for % user(s).', seeded;
  end if;
end $$;
