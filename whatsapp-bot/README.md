# Murimi WhatsApp farmer bot

WhatsApp assistant for farmers, built with [whatsapp-web.js](https://wwebjs.dev/). When a farmer says **hoi** (or hello, makadii, etc.), Murimi greets them and sends a natural-language summary of their Verdant workspace: farms, crops, growth stage, health, moisture, nodes, and alerts.

## Setup

1. Apply Supabase migrations (including `20260516100000_profiles_whatsapp_phone.sql`).
2. Copy `.env.example` to `.env` and set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Project Settings → API)
   - Optional: `MURIMI_GEMINI_API_KEY` for free-form questions after the greeting
   - Optional: `DEV_FARMER_USER_ID` for local testing without linking a phone
3. Link a farmer’s WhatsApp number (digits only, E.164 style):

```sql
update public.profiles
set whatsapp_phone = '263771234567'
where id = 'YOUR_USER_UUID';
```

4. **Use local Chrome** (fixes Puppeteer crashes on Windows). Add to `.env`:

```env
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

If unset, the bot auto-detects Chrome in common install locations.

5. Install and run (use **Node 20 LTS** if you see Puppeteer crashes on Node 22):

```bash
cd whatsapp-bot
npm install
npm start
```

If startup fails with `Execution context was destroyed`:

```bash
npm run reset-auth
npm start
```

Scan the QR code with WhatsApp → **Linked devices**.

## Behaviour

| Message | Response |
|--------|----------|
| `hoi`, `hello`, `makadii`, … | Greeting + farm snapshot |
| `summary`, `stats`, `status` | Same snapshot |
| `help` | Command list |
| Anything else | Gemini (if key set) with live farm context, else rule-based fallback |

## Notes

- Uses **service role** server-side only; never expose that key to the web app.
- Session data is stored in `.wwebjs_auth/` (gitignored).
- Set `WHATSAPP_ALLOW_GROUPS=1` to respond in group chats (default: direct chats only).
