-- Link a farmer's WhatsApp number to their workspace (used by whatsapp-bot with service role).

alter table public.profiles
  add column if not exists whatsapp_phone text;

create unique index if not exists profiles_whatsapp_phone_unique_idx
  on public.profiles (whatsapp_phone)
  where whatsapp_phone is not null;

comment on column public.profiles.whatsapp_phone is
  'E.164 digits only, e.g. 263771234567 — matched by the Murimi WhatsApp bot.';
