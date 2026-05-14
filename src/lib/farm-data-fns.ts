import { createServerFn } from "@tanstack/react-start";

import { loadFarmSnapshotWithFallback } from "@/lib/farm-db";

export const getFarmSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  return loadFarmSnapshotWithFallback();
});
