import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Leaf, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth/sign-in")({
  component: SignInPage,
  validateSearch: (raw) => z.object({ redirect: z.string().optional() }).parse(raw),
  head: () => ({ meta: [{ title: "Sign in · Verdant" }] }),
});

function SignInPage() {
  const { signIn, loading: authLoading, supabase } = useAuth();
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth/sign-in" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Signed in");
      const target =
        redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : null;
      if (target) {
        window.location.href = target;
        return;
      }
      await navigate({ to: "/" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {!supabase && (
        <p className="text-sm text-destructive mb-4 text-center">
          Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.
        </p>
      )}
      <div className="flex items-center gap-2 mb-8 justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-md">
          <Leaf className="h-5 w-5" />
        </div>
        <span className="font-display text-xl font-bold">Verdant</span>
      </div>
      <Card className="border-border/80 shadow-lg">
        <CardHeader>
          <CardTitle className="font-display">Sign in</CardTitle>
          <CardDescription>Use your Verdant account to manage fields and actuators.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting || !supabase}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              No account?{" "}
              <Link to="/auth/sign-up" className="text-primary font-medium hover:underline">
                Create one
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
