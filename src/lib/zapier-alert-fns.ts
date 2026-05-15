import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createSupabaseServerClientWithUserJwt } from "@/lib/supabase-server";

const inputSchema = z.object({
  accessToken: z.string().min(20),
  nodeIds: z.array(z.string().uuid()).min(1).max(50),
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(8000),
  fieldLabel: z.string().min(1).max(500),
  crop: z.string().max(200).optional(),
});

function personalizeBody(base: string, farmName: string, nodeName: string, role: string): string {
  return `This alert is routed for **${nodeName}** (${role}) on **${farmName}**.\n\n${base}`;
}

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POSTs a JSON payload to each node's Zapier Catch Hook (or compatible HTTPS URL).
 * Use a Zap such as **Webhooks by Zapier → Email by Zapier** and map `farmer_email`, `title`, `body`, etc.
 */
export const sendZapierAlertsToNodes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const client = createSupabaseServerClientWithUserJwt(data.accessToken);
    if (!client) return { ok: false as const, error: "Supabase is not configured on the server." };

    const { data: rows, error } = await client
      .from("farm_nodes")
      .select("id,zapier_webhook_url,farmer_email,name,node_role,farms(name)")
      .in("id", data.nodeIds);

    if (error) return { ok: false as const, error: error.message };

    type Row = {
      id: string;
      zapier_webhook_url: string | null;
      farmer_email: string | null;
      name: string;
      node_role: string;
      farms: { name: string } | null;
    };

    const results: { nodeId: string; skipped?: boolean; ok: boolean; status: number }[] = [];

    for (const row of (rows ?? []) as Row[]) {
      const url = row.zapier_webhook_url?.trim();
      if (!url) {
        results.push({ nodeId: row.id, skipped: true, ok: false, status: 0 });
        continue;
      }
      const farmName = row.farms?.name ?? "";
      const payload = {
        event: "verdant_ai_recommendation",
        title: data.title,
        body: personalizeBody(data.body, farmName, row.name, row.node_role),
        field: data.fieldLabel,
        crop: data.crop ?? "",
        farmer_email: row.farmer_email ?? "",
        node_id: row.id,
        node_name: row.name,
        node_role: row.node_role,
        farm_name: farmName,
        source: "verdant",
      };
      const { ok, status } = await postJson(url, payload);
      results.push({ nodeId: row.id, ok, status });
    }

    return { ok: true as const, results };
  });
