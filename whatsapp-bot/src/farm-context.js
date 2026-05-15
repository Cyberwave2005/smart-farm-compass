const HEALTH_WORDS = {
  healthy: "looking strong",
  warning: "needs attention",
  critical: "urgent — act soon",
};

function healthLine(plot) {
  const word = HEALTH_WORDS[plot.status] ?? plot.status;
  return `Health ${plot.health}% (${word})`;
}

export async function loadFarmerWorkspace(supabase, userId) {
  const [farmsRes, plotsRes, alertsRes, nodesRes] = await Promise.all([
    supabase
      .from("farms")
      .select("id, name, weather_label, weather_lat, weather_lon, sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("farm_plots")
      .select(
        "id, farm_id, name, crop, stage, area_ha, health, moisture, temp, humidity, ph, status, sort_order, farms(name)",
      )
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("user_alerts")
      .select("id, level, title, field_label, time_label, resolved")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
    supabase.from("farm_nodes").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const err = farmsRes.error ?? plotsRes.error ?? alertsRes.error ?? nodesRes.error;
  if (err) throw new Error(err.message);

  const farms = farmsRes.data ?? [];
  const plots = (plotsRes.data ?? []).map((p) => ({
    ...p,
    farmName: p.farms?.name ?? "Farm",
  }));
  const alerts = alertsRes.data ?? [];
  const nodeCount = nodesRes.count ?? 0;
  const openAlerts = alerts.filter((a) => !a.resolved);

  return { farms, plots, alerts, openAlerts, nodeCount };
}

/** Plain-text block injected into Gemini + used for templated replies. */
export function workspaceToContextText(workspace, displayName) {
  const { farms, plots, openAlerts, nodeCount } = workspace;
  const lines = [];
  lines.push(`Farmer: ${displayName || "murimi"}`);
  lines.push(`Farms (${farms.length}): ${farms.map((f) => f.name).join("; ") || "none"}`);
  lines.push(`IoT nodes: ${nodeCount}`);
  lines.push(`Open alerts: ${openAlerts.length}`);

  for (const p of plots) {
    lines.push(
      [
        `Plot: ${p.farmName} — ${p.name}`,
        `Crop: ${p.crop}, stage: ${p.stage}`,
        healthLine(p),
        `Moisture ${p.moisture}%, temp ${p.temp}°C, humidity ${p.humidity}%, pH ${p.ph}`,
        `Area ${p.area_ha} ha`,
      ].join(" | "),
    );
  }

  for (const a of openAlerts.slice(0, 5)) {
    lines.push(`Alert [${a.level}]: ${a.title} (${a.field_label}, ${a.time_label})`);
  }

  return lines.join("\n");
}

export function buildGreetingReply(workspace, displayName) {
  const name = displayName?.trim() || "murimi";
  const { farms, plots, openAlerts, nodeCount } = workspace;

  if (!farms.length && !plots.length) {
    return (
      `Makadii ${name}! 👋 I'm *Murimi*, your farm assistant on WhatsApp.\n\n` +
      `I don't see any farms linked to your number yet. Open the Verdant app, complete onboarding, ` +
      `then ask your admin to link this WhatsApp number on your profile.\n\n` +
      `For testing, set *DEV_FARMER_USER_ID* in whatsapp-bot/.env to your Supabase user id.`
    );
  }

  const parts = [];
  parts.push(`Makadii ${name}! 👋 *Murimi* here — your farm assistant.`);
  parts.push("");

  if (farms.length) {
    parts.push(`🌾 *${farms.length} farm${farms.length === 1 ? "" : "s"}*: ${farms.map((f) => f.name).join(" · ")}`);
    parts.push("");
  }

  for (const p of plots.slice(0, 4)) {
    const emoji = p.status === "critical" ? "🔴" : p.status === "warning" ? "🟡" : "🟢";
    parts.push(`${emoji} *${p.farmName}*`);
    parts.push(`   ${p.name}`);
    parts.push(`   Crop: *${p.crop}* · Stage: *${p.stage}*`);
    parts.push(`   ${healthLine(p)}`);
    parts.push(`   Moisture ${p.moisture}% · ${p.temp}°C · pH ${p.ph}`);
    parts.push("");
  }

  if (plots.length > 4) {
    parts.push(`_…and ${plots.length - 4} more plot(s) in your dashboard._`);
    parts.push("");
  }

  parts.push(`📡 *${nodeCount}* node${nodeCount === 1 ? "" : "s"} registered`);

  if (openAlerts.length) {
    parts.push(`⚠️ *${openAlerts.length} open alert${openAlerts.length === 1 ? "" : "s"}*:`);
    for (const a of openAlerts.slice(0, 3)) {
      parts.push(`   • ${a.title} (${a.field_label})`);
    }
  } else {
    parts.push("✅ No open alerts right now.");
  }

  parts.push("");
  parts.push("Ask me about *irrigation*, *pests*, *your crop stage*, or say *summary* anytime.");

  return parts.join("\n");
}

export function buildUnlinkedReply(digits) {
  return (
    `Makadii! 👋 I'm *Murimi*, the Verdant farm assistant.\n\n` +
    `This WhatsApp number (${digits || "unknown"}) is not linked to a farm account yet.\n\n` +
    `Link it in Supabase:\n` +
    `\`update public.profiles set whatsapp_phone = '${digits}' where id = 'YOUR_USER_UUID';\`\n\n` +
    `Use digits only (e.g. 26377…). Then say *hoi* again.`
  );
}
