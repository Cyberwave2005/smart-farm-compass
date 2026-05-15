import { useMemo, createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useAuth } from "@/context/auth-context";
import { getFarmSnapshot } from "@/lib/farm-data-fns";
import type { FarmSnapshot } from "@/lib/farm-data";
import { DEMO_FARM_SNAPSHOT } from "@/lib/farm-data";

type FarmDataContextValue = {
  snapshot: FarmSnapshot;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  farms: FarmSnapshot["farms"];
  fields: FarmSnapshot["fields"];
  nodes: FarmSnapshot["nodes"];
  actuators: FarmSnapshot["actuators"];
  alerts: FarmSnapshot["alerts"];
  recommendations: FarmSnapshot["recommendations"];
  devices: FarmSnapshot["devices"];
  webhookEvents: FarmSnapshot["webhookEvents"];
};

const FarmDataContext = createContext<FarmDataContextValue | null>(null);

export function FarmDataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const token = session?.access_token;
  const load = useServerFn(getFarmSnapshot);
  const q = useQuery({
    queryKey: ["farm-snapshot", token ?? "none"],
    queryFn: () => load({ data: { accessToken: token } }) as Promise<FarmSnapshot>,
    enabled: Boolean(token),
    staleTime: 60 * 1000,
    placeholderData: DEMO_FARM_SNAPSHOT,
  });

  const snapshot = q.data ?? DEMO_FARM_SNAPSHOT;

  const value = useMemo<FarmDataContextValue>(
    () => ({
      snapshot,
      isLoading: Boolean(token) && q.isFetching && q.dataUpdatedAt === 0,
      isError: q.isError,
      refetch: () => void q.refetch(),
      farms: snapshot.farms,
      fields: snapshot.fields,
      nodes: snapshot.nodes,
      actuators: snapshot.actuators,
      alerts: snapshot.alerts,
      recommendations: snapshot.recommendations,
      devices: snapshot.devices,
      webhookEvents: snapshot.webhookEvents,
    }),
    [snapshot, token, q.isFetching, q.dataUpdatedAt, q.isError, q.refetch],
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
