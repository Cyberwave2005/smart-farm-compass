import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Droplets, Beaker, ShieldAlert, CloudSun, Check, X } from "lucide-react";
import { useFarmData } from "@/context/farm-data-context";
import type { Recommendation } from "@/lib/farm-data";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const iconMap = {
  irrigation: Droplets, fertilizer: Beaker, disease: ShieldAlert, climate: CloudSun,
};

const toneMap = {
  irrigation: "text-info bg-info/10",
  fertilizer: "text-success bg-success/10",
  disease: "text-destructive bg-destructive/10",
  climate: "text-warning-foreground bg-warning/15",
};

export function AIRecommendations() {
  const { recommendations: recsFromCtx } = useFarmData();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const recs = recsFromCtx.filter((r) => !dismissed.has(r.id));
  const [confirming, setConfirming] = useState<Recommendation | null>(null);

  const accept = (r: Recommendation) => setConfirming(r);
  const reject = (id: string) => {
    setDismissed((p) => new Set(p).add(id));
    toast.info("Recommendation dismissed");
  };
  const confirm = () => {
    if (!confirming) return;
    setDismissed((p) => new Set(p).add(confirming.id));
    toast.success(`Action queued: ${confirming.title}`, {
      description: `${confirming.field} · logged to audit trail`,
    });
    setConfirming(null);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold">AI Recommendations</h3>
            <p className="text-xs text-muted-foreground">Crop-aware · climate-adjusted</p>
          </div>
        </div>
        <Badge variant="secondary">{recs.length} pending</Badge>
      </div>

      <div className="space-y-3">
        {recs.map((r) => {
          const Icon = iconMap[r.type];
          return (
            <div key={r.id} className="rounded-xl border bg-card/50 p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneMap[r.type]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm leading-tight">{r.title}</h4>
                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                      {Math.round(r.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">{r.field}</span> · {r.crop}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground mb-3">{r.reason}</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => accept(r)}>
                      <Check className="h-3 w-3" /> Accept
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => reject(r.id)}>
                      <X className="h-3 w-3" /> Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {recs.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            All caught up. New insights will appear here.
          </div>
        )}
      </div>

      <AlertDialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm action</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to execute: <strong>{confirming?.title}</strong> on{" "}
              <strong>{confirming?.field}</strong>. This will trigger remote actuators and be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>Execute &amp; log</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
