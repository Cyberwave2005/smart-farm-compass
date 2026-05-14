import { useMemo, createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getFarmSnapshot } from "@/lib/farm-data-fns";
import type { FarmSnapshot } from "@/lib/farm-data";
import { getStaticFarmSnapshot } from "@/lib/farm-data";

type FarmDataContextValue = {
  snapshot: FarmSnapshot;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  fields: FarmSnapshot["fields"];
  alerts: FarmSnapshot["alerts"];
  recommendations: FarmSnapshot["recommendations"];
  devices: FarmSnapshot["devices"];
  webhookEvents: FarmSnapshot["webhookEvents"];
};

const FarmDataContext = createContext<FarmDataContextValue | null>(null);

const staticSnapshot = getStaticFarmSnapshot();

export function FarmDataProvider({ children }: { children: ReactNode }) {
  const load = useServerFn(getFarmSnapshot);
  const q = useQuery({
    queryKey: ["farm-snapshot"],
    queryFn: () => load() as Promise<FarmSnapshot>,
    staleTime: 60 * 1000,
    placeholderData: staticSnapshot,
  });

  const snapshot = q.data ?? staticSnapshot;

  const value = useMemo<FarmDataContextValue>(
    () => ({
      snapshot,
      isLoading: q.isFetching && q.dataUpdatedAt === 0,
      isError: q.isError,
      refetch: () => void q.refetch(),
      fields: snapshot.fields,
      alerts: snapshot.alerts,
      recommendations: snapshot.recommendations,
      devices: snapshot.devices,
      webhookEvents: snapshot.webhookEvents,
    }),
    [snapshot, q.isLoading, q.data, q.isError, q.refetch],
  );

  return <FarmDataContext.Provider value={value}>{children}</FarmDataContext.Provider>;
}

export function useFarmData(): FarmDataContextValue {
  const ctx = useContext(FarmDataContext);
  if (!ctx) {
    throw new Error("useFarmData must be used within FarmDataProvider");
  }
  return ctx;
}
