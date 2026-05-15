import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import { FarmWorkspaceWizard } from "@/components/farm-workspace-wizard";
import { useFarmData } from "@/context/farm-data-context";

export const Route = createFileRoute("/manage-farm")({
  component: ManageFarmPage,
  head: () => ({ meta: [{ title: "Manage my farm · Verdant" }] }),
});

function ManageFarmPage() {
  const { farms, nodes, actuators, isLoading, refetch } = useFarmData();

  const dataRevision = useMemo(
    () =>
      [
        farms
          .map((f) => `${f.id}:${f.name}:${f.weather_lat ?? ""}:${f.weather_lon ?? ""}:${f.weather_label ?? ""}`)
          .join(";"),
        nodes.map((n) =>
          `${n.id}:${n.farmId}:${n.name}:${n.role}:${n.connectivityNotes ?? ""}:${n.farmerEmail ?? ""}:${n.zapierWebhookUrl ?? ""}`,
        ).join("|"),
        actuators.map((a) => `${a.id}:${a.farm_id ?? ""}:${a.name}:${a.actuator_type}`).join("|"),
      ].join("::"),
    [farms, nodes, actuators],
  );

  const manageSnapshot = useMemo(() => ({ farms, nodes, actuators }), [farms, nodes, actuators]);

  if (isLoading && farms.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <FarmWorkspaceWizard
      mode="manage"
      manageSnapshot={manageSnapshot}
      dataRevision={dataRevision}
      onManageSaved={() => void refetch()}
    />
  );
}
