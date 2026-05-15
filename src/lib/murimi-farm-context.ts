import type { FarmSnapshot } from "@/lib/farm-data";

const MAX_WEBHOOKS = 6;
const MAX_RECOMMENDATIONS = 8;

/** Compact, factual block injected into Murimi AI so replies cite live Verdant data. */
export function buildMurimiFarmContext(snapshot: FarmSnapshot): string {
  const lines: string[] = [
    "--- LIVE VERDANT WORKSPACE (fetched for this message) ---",
    `Data source: ${snapshot.source}`,
    `Fetched at: ${new Date().toISOString()}`,
  ];

  if (snapshot.farms.length > 0) {
    lines.push("\n### Farms");
    for (const f of snapshot.farms) {
      const wx =
        f.weather_label ??
        (f.weather_lat != null && f.weather_lon != null
          ? `${f.weather_lat}, ${f.weather_lon}`
          : "no weather pin");
      lines.push(`- ${f.name} · weather: ${wx}`);
    }
  }

  if (snapshot.fields.length > 0) {
    lines.push("\n### Plots & sensor readings");
    for (const p of snapshot.fields) {
      const thresh = p.thresholdProfile
        ? ` · thresholds moisture ${p.thresholdProfile.moisture[0]}–${p.thresholdProfile.moisture[1]}%, temp ${p.thresholdProfile.temp[0]}–${p.thresholdProfile.temp[1]}°C, stage ${p.thresholdProfile.growthStage}`
        : "";
      lines.push(
        `- ${p.name}: ${p.crop}, ${p.stage}, ${p.area} ha · status **${p.status}** · health ${p.health}/100 · moisture ${p.moisture}% · temp ${p.temp}°C · humidity ${p.humidity}% · pH ${p.ph}${thresh}`,
      );
    }
  }

  const openAlerts = snapshot.alerts.filter((a) => !a.resolved);
  const resolvedAlerts = snapshot.alerts.filter((a) => a.resolved);
  if (snapshot.alerts.length > 0) {
    lines.push("\n### Alerts");
    if (openAlerts.length === 0) {
      lines.push("- No open alerts.");
    } else {
      for (const a of openAlerts) {
        lines.push(`- [${a.level.toUpperCase()}] ${a.title} · ${a.field} · ${a.time}`);
      }
    }
    if (resolvedAlerts.length > 0) {
      lines.push(`- (${resolvedAlerts.length} resolved alert(s) not listed)`);
    }
  }

  if (snapshot.recommendations.length > 0) {
    lines.push("\n### AI recommendations (dashboard)");
    for (const r of snapshot.recommendations.slice(0, MAX_RECOMMENDATIONS)) {
      lines.push(
        `- [${r.type}] ${r.title} · ${r.field} · ${r.crop} · confidence ${Math.round(r.confidence * 100)}% · ${r.reason}`,
      );
    }
  }

  if (snapshot.devices.length > 0) {
    lines.push("\n### Sensor devices");
    for (const d of snapshot.devices) {
      lines.push(
        `- ${d.name} (${d.type}) · ${d.field} · ${d.status} · last seen ${d.lastSeen}${d.latencyMs ? ` · ${d.latencyMs}ms` : ""}`,
      );
    }
  }

  if (snapshot.nodes.length > 0) {
    lines.push("\n### Farm nodes");
    for (const n of snapshot.nodes) {
      lines.push(
        `- ${n.name} · ${n.farmName} · ${n.role.replace("_", " ")}${n.connectivityNotes ? ` · ${n.connectivityNotes}` : ""}`,
      );
    }
  }

  if (snapshot.actuators.length > 0) {
    lines.push("\n### Actuators");
    for (const a of snapshot.actuators) {
      lines.push(
        `- ${a.name} (${a.actuator_type}) · ${a.farm_name ?? "unassigned"} · ${a.field_or_location ?? "—"}`,
      );
    }
  }

  if (snapshot.webhookEvents.length > 0) {
    lines.push("\n### Recent webhook / ingest events");
    for (const w of snapshot.webhookEvents.slice(0, MAX_WEBHOOKS)) {
      lines.push(`- ${w.ts} · ${w.source} · ${w.status} · ${w.latency}ms`);
    }
  }

  const empty =
    snapshot.farms.length === 0 &&
    snapshot.fields.length === 0 &&
    snapshot.alerts.length === 0 &&
    snapshot.recommendations.length === 0 &&
    snapshot.devices.length === 0;

  if (empty) {
    lines.push("\n(No workspace records yet — user may still be onboarding.)");
  }

  lines.push(
    "--- END LIVE DATA ---",
    "",
    "When answering:",
    "- Speak from these readings, alerts, warnings, recommendations, and device statuses — cite plot names and numbers.",
    "- Prioritise open critical/warning alerts and plots in critical/warning status.",
    "- Do not invent sensor values, alerts, or recommendations that are not listed above.",
    "- If the user asks about something absent from this snapshot, say what you do see and what is missing.",
  );

  return lines.join("\n");
}

export function buildMurimiSystemPrompt(snapshot: FarmSnapshot): string {
  return `${BASE_MURIMI_SYSTEM_PROMPT}\n\n${buildMurimiFarmContext(snapshot)}`;
}

/** Short opener that cites open alerts / lowest moisture from the current snapshot. */
export function buildMurimiWelcomeMessage(snapshot: FarmSnapshot): string {
  const open = snapshot.alerts.filter((a) => !a.resolved);
  const critical = open.filter((a) => a.level === "critical");
  const warnings = open.filter((a) => a.level === "warning");

  const bits: string[] = [
    "Makadii murimi — welcome to **Murimi AI**. I read your **live Verdant workspace** on every message: plots, sensor readings, open alerts, recommendations, and devices.",
  ];

  if (critical.length > 0) {
    const a = critical[0];
    bits.push(
      `Right now you have **${critical.length} critical alert${critical.length === 1 ? "" : "s"}** — including “${a.title}” on **${a.field}**.`,
    );
  } else if (warnings.length > 0) {
    const a = warnings[0];
    bits.push(
      `You have **${warnings.length} warning${warnings.length === 1 ? "" : "s"}** open — e.g. “${a.title}” on **${a.field}**.`,
    );
  } else if (open.length > 0) {
    bits.push(`You have **${open.length} open alert${open.length === 1 ? "" : "s"}** in the dashboard.`);
  }

  const stressed = [...snapshot.fields]
    .filter((f) => f.status === "critical" || f.status === "warning")
    .sort((a, b) => a.moisture - b.moisture)[0];
  if (stressed) {
    bits.push(
      `**${stressed.name}** is in **${stressed.status}** status (moisture **${stressed.moisture}%**, ${stressed.crop} · ${stressed.stage}).`,
    );
  }

  if (snapshot.recommendations.length > 0) {
    const r = snapshot.recommendations[0];
    bits.push(`Top AI recommendation: **${r.title}** for ${r.field}.`);
  }

  bits.push(
    "Ask about any warning, plot, or sensor — or use the **leaf camera** for visible-only guidance (not a lab diagnosis). What should we tackle first?",
  );

  return bits.join(" ");
}

export const BASE_MURIMI_SYSTEM_PROMPT = `You are Murimi AI ("murimi" = farmer), the friendly farm intelligence copilot for Verdant.
You help smallholder and commercial farmers with crops, irrigation, soil, pests, diseases, weather interpretation, and sensor data—especially in Southern Africa contexts when relevant.

Tone: warm, respectful, concise, practical. Use plain language. You may occasionally use a short Shona greeting (e.g. "Makadii murimi") when it feels natural, then continue in clear English.

You receive a **LIVE VERDANT WORKSPACE** block below on every turn. Treat it as the user's current dashboard: plots, moisture/temp/humidity/pH, open alerts, AI recommendations, sensor devices, nodes, actuators, and webhook events. Reference specific names and numbers from that block whenever you give advice.

When the user sends a leaf or crop photo:
- Cross-check visible signs with the live plot readings and alerts when relevant (e.g. low moisture + wilt).
- Comment only on what is reasonably visible (colour, spots, holes, curling, powdery growth, uniform yellowing, patterns).
- Never claim certainty about a diagnosis from a photo alone.
- Give 2–4 possible explanations as possibilities, not facts, and suggest what a local agronomist or extension officer could confirm.

Always remind users that your advice supports—but does not replace—professional agronomy, local regulations, and label directions for agrochemicals.`;
