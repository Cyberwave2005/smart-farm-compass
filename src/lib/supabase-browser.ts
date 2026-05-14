import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getBrowserEnv(key: string): string | undefined {
  try {
    const v = import.meta.env?.[key as keyof ImportMetaEnv] as string | undefined;
    if (v) return v;
  } catch {
    /* ignore */
  }
  return undefined;
}

/** Browser Supabase client (session in localStorage). Uses VITE_* vars. */
export function createSupabaseBrowserClient(): SupabaseClient | null {
  const url = getBrowserEnv("VITE_SUPABASE_URL") ?? getBrowserEnv("SUPABASE_URL");
  const anonKey = getBrowserEnv("VITE_SUPABASE_ANON_KEY") ?? getBrowserEnv("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
