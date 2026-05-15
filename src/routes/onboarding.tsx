import { createFileRoute } from "@tanstack/react-router";

import { FarmWorkspaceWizard } from "@/components/farm-workspace-wizard";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
  head: () => ({ meta: [{ title: "Welcome · Verdant" }] }),
});

function OnboardingPage() {
  return <FarmWorkspaceWizard mode="onboarding" />;
}
