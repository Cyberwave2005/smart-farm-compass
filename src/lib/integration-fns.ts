import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  exportDataModelSchema,
  getGoogleDocsLink,
  getTelemetryMapping,
  listTelemetry,
  setGoogleDocsLink,
  setTelemetryMapping,
  type GoogleDocsLink,
  type TelemetryMapping,
} from "@/lib/integration-hub";

const mappingPatchSchema = z.object({
  deviceIdPaths: z.array(z.string()).optional(),
  moistureKeys: z.array(z.string()).optional(),
  temperatureKeys: z.array(z.string()).optional(),
  humidityKeys: z.array(z.string()).optional(),
  phKeys: z.array(z.string()).optional(),
  timestampKeys: z.array(z.string()).optional(),
});

const googleDocsSchema = z.object({
  documentId: z.string().min(3),
  label: z.string().max(120).optional(),
});

export const getIntegrationState = createServerFn({ method: "GET" }).handler(async () => {
  return {
    mapping: getTelemetryMapping(),
    googleDocs: getGoogleDocsLink(),
    events: listTelemetry(40),
    dataModel: exportDataModelSchema(),
  };
});

export const saveTelemetryMapping = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => mappingPatchSchema.parse(d))
  .handler(async ({ data }) => {
    const next: Partial<TelemetryMapping> = {};
    (Object.keys(data) as (keyof TelemetryMapping)[]).forEach((k) => {
      const v = data[k];
      if (v !== undefined) (next as Record<string, unknown>)[k] = v;
    });
    const mapping = setTelemetryMapping(next);
    return { mapping };
  });

export const saveGoogleDocsLink = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => googleDocsSchema.parse(d))
  .handler(async ({ data }) => {
    const link: GoogleDocsLink = {
      documentId: data.documentId.trim(),
      label: (data.label ?? "Research doc").trim(),
    };
    setGoogleDocsLink(link);
    return { googleDocs: getGoogleDocsLink() };
  });

export const clearGoogleDocsLink = createServerFn({ method: "POST" }).handler(async () => {
  setGoogleDocsLink(null);
  return { googleDocs: null as GoogleDocsLink | null };
});
