import { createFileRoute } from "@tanstack/react-router";
import { FieldCard } from "@/components/dashboard/field-card";
import { useFarmData } from "@/context/farm-data-context";

export const Route = createFileRoute("/fields")({
  component: FieldsPage,
  head: () => ({ meta: [{ title: "Fields · Verdant" }] }),
});

function FieldsPage() {
  const { fields } = useFarmData();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Fields</h1>
        <p className="text-muted-foreground">All monitored fields across your farms</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((f) => <FieldCard key={f.id} field={f} />)}
      </div>
    </div>
  );
}
