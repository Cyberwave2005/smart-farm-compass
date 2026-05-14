import { createFileRoute } from "@tanstack/react-router";

import { ingestPayload } from "@/lib/integration-hub";

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

function getWebhookSecret(): string | undefined {
  try {
    const fromImport = import.meta.env?.INTEGRATION_WEBHOOK_SECRET as string | undefined;
    if (fromImport) return fromImport;
  } catch {
    /* ignore */
  }
  if (typeof process !== "undefined" && process.env?.INTEGRATION_WEBHOOK_SECRET) {
    return process.env.INTEGRATION_WEBHOOK_SECRET;
  }
  return undefined;
}

function authorize(request: Request): boolean {
  const expected = getWebhookSecret();
  if (!expected) return true;
  const header =
    request.headers.get("x-integration-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  return header === expected;
}

export const Route = createFileRoute("/api/integrations/ingest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("probe") === "1") {
          return json({ ok: true, route: "/api/integrations/ingest" });
        }
        return json({
          ok: true,
          message: "POST JSON payloads here from Arduino Cloud webhooks or other HTTP integrators.",
          methods: ["GET", "POST"],
        });
      },
      POST: async ({ request }) => {
        if (!authorize(request)) {
          return json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        let body: unknown;
        const ct = request.headers.get("content-type") ?? "";
        try {
          if (ct.includes("application/json")) {
            body = await request.json();
          } else {
            const text = await request.text();
            body = text ? JSON.parse(text) : {};
          }
        } catch {
          return json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
        }
        const { normalized, warnings } = ingestPayload(body, request.headers);
        return json({ ok: true, id: normalized.id, warnings, normalized });
      },
    },
  },
});
