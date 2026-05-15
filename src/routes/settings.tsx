import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CircleAlert, LogOut } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings · Verdant" }] }),
});

function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const needsOnboarding = profile && !profile.onboarding_completed;

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-12">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Account and workspace setup.</p>
      </div>

      {needsOnboarding && (
        <Alert>
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Workspace setup not finished</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Add at least one farm (or skip with the guided flow) so your dashboard and maps can load your data.</p>
            <Button asChild className="mt-1">
              <Link to="/onboarding">Continue onboarding</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Account</CardTitle>
          <CardDescription>Signed in as {user.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.display_name && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Display name</p>
              <p className="text-sm text-foreground mt-0.5">{profile.display_name}</p>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              void (async () => {
                await signOut();
                await navigate({ to: "/auth/sign-in" });
              })();
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
