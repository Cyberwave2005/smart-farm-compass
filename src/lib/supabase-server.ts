import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve env for server functions / SSR. Prefer `VITE_*` first: Vite only injects those into
 * `import.meta.env` for bundled code, so `SUPABASE_URL` alone is often undefined on the server
 * even when `.env` defines it — which made `getFarmSnapshot` return empty workspaces while the
 * browser client (which reads `VITE_SUPABASE_*`) still worked.
 */
function getEnvFirst(...names: string[]): string | undefined {
  for (const name of names) {
    try {
      const v = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[
        name
      ];
      if (v) return v;
    } catch {
      /* ignore */
    }
  }
  if (typeof process !== "undefined" && process.env) {
    for (const name of names) {
      const v = process.env[name];
      if (v) return v;
    }
  }
  return undefined;
}

function supabaseUrl(): string | undefined {
  return getEnvFirst("VITE_SUPABASE_URL", "SUPABASE_URL");
}

function supabaseAnonKey(): string | undefined {
  return getEnvFirst("VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY");
}

/** Server-side Supabase client (anon key + RLS). Returns null if env is not configured. */
export function createSupabaseServerClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Same anon client, but RLS runs as the signed-in user (pass the browser session JWT). */
export function createSupabaseServerClientWithUserJwt(accessToken: string): SupabaseClient | null {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey || !accessToken?.trim()) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken.trim()}` },
    },
  });
}
