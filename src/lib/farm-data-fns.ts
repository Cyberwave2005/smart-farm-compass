import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { loadFarmSnapshotForUser, loadFarmSnapshotWithFallback } from "@/lib/farm-db";

const snapshotInputSchema = z.object({
  accessToken: z.string().min(10).optional(),
});

export const getFarmSnapshot = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => snapshotInputSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const token = data.accessToken?.trim();
    if (token) {
      return loadFarmSnapshotForUser(token);
    }
    return loadFarmSnapshotWithFallback();
  });
