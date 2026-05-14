import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getEnv(name: string): string | undefined {
  try {
    const v = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[name];
    if (v) return v;
  } catch {
    /* ignore */
  }
  if (typeof process !== "undefined" && process.env?.[name]) {
    return process.env[name];
  }
  return undefined;
}

/** Server-side Supabase client (anon key + RLS). Returns null if env is not configured. */
export function createSupabaseServerClient(): SupabaseClient | null {
  const url = getEnv("SUPABASE_URL");
  const anonKey = getEnv("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Same anon client, but RLS runs as the signed-in user (pass the browser session JWT). */
export function createSupabaseServerClientWithUserJwt(accessToken: string): SupabaseClient | null {
  const url = getEnv("SUPABASE_URL");
  const anonKey = getEnv("SUPABASE_ANON_KEY");
  if (!url || !anonKey || !accessToken?.trim()) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken.trim()}` },
    },
  });
}
