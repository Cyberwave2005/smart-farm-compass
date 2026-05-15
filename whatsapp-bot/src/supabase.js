import { createClient } from "@supabase/supabase-js";

import { phoneMatchCandidates } from "./phone.js";

export function createServiceClient(url, serviceKey) {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function resolveFarmerUserId(supabase, waFrom, devFarmerUserId) {
  if (devFarmerUserId) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", devFarmerUserId)
      .maybeSingle();
    return {
      userId: devFarmerUserId,
      displayName: data?.display_name ?? null,
      linked: "dev",
    };
  }

  const candidates = phoneMatchCandidates(waFrom);
  if (!candidates.length) return { userId: null, displayName: null, linked: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, whatsapp_phone")
    .in("whatsapp_phone", candidates)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42703" || error.message?.includes("whatsapp_phone")) {
      console.warn("[whatsapp-bot] profiles.whatsapp_phone missing — run migration 20260516100000.");
    } else {
      console.error("[whatsapp-bot] profile lookup error", error.message);
    }
    return { userId: null, displayName: null, linked: null };
  }

  if (data?.id) {
    return { userId: data.id, displayName: data.display_name, linked: "phone" };
  }

  return { userId: null, displayName: null, linked: null };
}
