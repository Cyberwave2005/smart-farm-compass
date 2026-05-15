-- Per-plot threshold profiles (JSON) and per-node Zapier / farmer routing for alerts.

alter table public.farm_plots
  add column if not exists threshold_profile jsonb;

alter table public.farm_nodes
  add column if not exists farmer_email text,
  add column if not exists zapier_webhook_url text;

comment on column public.farm_plots.threshold_profile is 'Optional { moisture, temp, humidity, ph ranges, growthStage, autoAdjust } for Thresholds UI.';
comment on column public.farm_nodes.farmer_email is 'Farmer contact email for Zapier / routing (informational payload).';
comment on column public.farm_nodes.zapier_webhook_url is 'Zapier Catch Hook or other HTTPS URL to POST JSON alerts.';
