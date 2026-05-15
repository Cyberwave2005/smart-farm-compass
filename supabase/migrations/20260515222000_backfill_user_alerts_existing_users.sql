-- Sample notifications for accounts that already have farms but no rows in user_alerts yet.

insert into public.user_alerts (user_id, level, title, field_label, time_label, resolved, sort_order)
select u.id, x.level, x.title, x.field_label, x.time_label, x.resolved, x.sort_order
from auth.users u
cross join lateral (
  values
    ('warning'::text, 'Soil moisture edging low on pivot'::text, 'Borrowdale · North centre-pivot'::text, '14 min ago'::text, false, 0),
    ('info', 'Light rain forecast tonight', 'Ruwa Packhouse & Fields', '2 h ago', false, 1),
    ('info', 'Gateway heartbeat OK', 'Borrowdale · IoT', 'Just now', true, 2)
) as x(level, title, field_label, time_label, resolved, sort_order)
where exists (select 1 from public.farms f where f.user_id = u.id)
  and not exists (select 1 from public.user_alerts a where a.user_id = u.id);
