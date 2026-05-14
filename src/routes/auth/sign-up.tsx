import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Leaf, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUpPage,
  head: () => ({ meta: [{ title: "Sign up · Verdant" }] }),
});

function SignUpPage() {
  const { signUp, loading: authLoading, supabase } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
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
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Check your email to confirm your account, then sign in.");
      await navigate({ to: "/auth/sign-in" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-2 mb-8 justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-md">
          <Leaf className="h-5 w-5" />
        </div>
        <span className="font-display text-xl font-bold">Verdant</span>
      </div>
      <Card className="border-border/80 shadow-lg">
        <CardHeader>
          <CardTitle className="font-display">Create account</CardTitle>
          <CardDescription>Join Verdant to monitor crops and configure farm actuators.</CardDescription>
        </CardHeader>
        <CardContent>
          {!supabase && (
            <p className="text-sm text-destructive mb-4">
              Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign up.
            </p>
          )}
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <Button type="submit" className="w-full" disabled={submitting || !supabase}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign up"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth/sign-in" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
