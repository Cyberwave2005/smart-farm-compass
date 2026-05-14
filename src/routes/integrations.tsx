import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  CloudCog,
  Copy,
  ExternalLink,
  Link2,
  RefreshCw,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

import {
  clearGoogleDocsLink,
  getIntegrationState,
  saveGoogleDocsLink,
  saveTelemetryMapping,
} from "@/lib/integration-fns";
import type { NormalizedTelemetry, TelemetryMapping } from "@/lib/integration-hub";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function splitKeys(s: string): string[] {
  return s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function joinKeys(keys: string[]): string {
  return keys.join(", ");
}

export const Route = createFileRoute("/integrations")({
  component: IntegrationsPage,
  head: () => ({ meta: [{ title: "Integrations · Verdant" }] }),
});

function IntegrationsPage() {
  const loadState = useServerFn(getIntegrationState);
  const saveMapping = useServerFn(saveTelemetryMapping);
  const saveDocs = useServerFn(saveGoogleDocsLink);
  const clearDocs = useServerFn(clearGoogleDocsLink);

  const [mapping, setMapping] = useState<TelemetryMapping | null>(null);
  const [events, setEvents] = useState<NormalizedTelemetry[]>([]);
  const [googleDocId, setGoogleDocId] = useState("");
  const [googleLabel, setGoogleLabel] = useState("Research doc");
  const [linkedDoc, setLinkedDoc] = useState<{ documentId: string; label: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [webhookBase, setWebhookBase] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await loadState();
      setMapping(s.mapping);
      setEvents(s.events);
      setLinkedDoc(s.googleDocs);
      if (s.googleDocs) {
        setGoogleDocId(s.googleDocs.documentId);
        setGoogleLabel(s.googleDocs.label);
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not load integration state.");
    } finally {
      setLoading(false);
    }
  }, [loadState]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookBase(`${window.location.origin}/api/integrations/ingest`);
    }
  }, []);

  const mappingForm = useMemo(() => {
    if (!mapping) return null;
    return {
      deviceIdPaths: joinKeys(mapping.deviceIdPaths),
      moistureKeys: joinKeys(mapping.moistureKeys),
      temperatureKeys: joinKeys(mapping.temperatureKeys),
      humidityKeys: joinKeys(mapping.humidityKeys),
      phKeys: joinKeys(mapping.phKeys),
      timestampKeys: joinKeys(mapping.timestampKeys),
    };
  }, [mapping]);

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mappingForm) setForm(mappingForm);
  }, [mappingForm]);

  async function submitMapping(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        deviceIdPaths: splitKeys(form.deviceIdPaths ?? ""),
        moistureKeys: splitKeys(form.moistureKeys ?? ""),
        temperatureKeys: splitKeys(form.temperatureKeys ?? ""),
        humidityKeys: splitKeys(form.humidityKeys ?? ""),
        phKeys: splitKeys(form.phKeys ?? ""),
        timestampKeys: splitKeys(form.timestampKeys ?? ""),
      };
      const { mapping: next } = await saveMapping({ data: payload });
      setMapping(next);
      toast.success("Telemetry mapping saved.");
    } catch (err) {
      console.error(err);
      toast.error("Invalid mapping input.");
    }
  }

  async function linkGoogleDoc(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await saveDocs({
        data: { documentId: googleDocId.trim(), label: googleLabel.trim() || "Research doc" },
      });
      setLinkedDoc(res.googleDocs);
      toast.success("Google Doc linked for your team.");
    } catch (err) {
      console.error(err);
      toast.error("Could not save document link.");
    }
  }

  async function unlinkGoogleDoc() {
    await clearDocs();
    setLinkedDoc(null);
    toast.message("Doc link cleared.");
  }

  function copyWebhook() {
    if (!webhookBase) return;
    void navigator.clipboard.writeText(webhookBase);
    toast.success("Webhook URL copied.");
  }

  function exportSchemaJson() {
    if (!mapping) return;
    const blob = new Blob([JSON.stringify({ mapping, events: events.slice(0, 20) }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `verdant-integration-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Download started.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground max-w-2xl">
            Connect Arduino Cloud webhooks, model incoming JSON into farm telemetry, and link a
            Google Doc for research notes or pipeline documentation.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="webhooks" className="gap-1.5">
            <CloudCog className="h-4 w-4" />
            Arduino &amp; webhooks
          </TabsTrigger>
          <TabsTrigger value="model" className="gap-1.5">
            <Link2 className="h-4 w-4" />
            Data modelling
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            Google Docs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ingest endpoint</CardTitle>
              <CardDescription>
                Point{" "}
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href="https://docs.arduino.cc/arduino-cloud/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Arduino Cloud
                </a>{" "}
                (or any HTTPS client) at this URL.                 Verdant stores the last 200 normalized readings in memory for this demo environment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm break-all">
                  {webhookBase || "/api/integrations/ingest"}
                </code>
                <Button type="button" variant="secondary" onClick={copyWebhook}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground flex gap-2">
                <Shield className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Optional shared secret</p>
                  <p>
                    Set <code className="text-xs bg-muted px-1 rounded">INTEGRATION_WEBHOOK_SECRET</code> in your
                    deployment environment, then send header{" "}
                    <code className="text-xs bg-muted px-1 rounded">X-Integration-Secret</code> or{" "}
                    <code className="text-xs bg-muted px-1 rounded">Authorization: Bearer …</code>{" "}
                    with the same value. If unset, the endpoint accepts unsigned posts (dev only).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent normalized events</CardTitle>
              <CardDescription>Latest payloads after JSON mapping (newest first).</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events yet. POST sample JSON to the ingest URL.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Received</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Moisture</TableHead>
                        <TableHead>Temp</TableHead>
                        <TableHead>RH</TableHead>
                        <TableHead>pH</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((ev) => (
                        <TableRow key={ev.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(ev.receivedAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {ev.source}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{ev.deviceId ?? "—"}</TableCell>
                          <TableCell>{ev.moisture ?? "—"}</TableCell>
                          <TableCell>{ev.temperature ?? "—"}</TableCell>
                          <TableCell>{ev.humidity ?? "—"}</TableCell>
                          <TableCell>{ev.ph ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="model" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">JSON field mapping</CardTitle>
              <CardDescription>
                Comma- or newline-separated keys tried in order. Device id paths support dot notation
                (for example <code className="text-xs">metadata.device</code>).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mapping && (
                <form onSubmit={submitMapping} className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="deviceIdPaths">Device / thing id paths</Label>
                    <Textarea
                      id="deviceIdPaths"
                      rows={2}
                      value={form.deviceIdPaths ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, deviceIdPaths: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="moistureKeys">Soil moisture keys</Label>
                    <Input
                      id="moistureKeys"
                      value={form.moistureKeys ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, moistureKeys: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temperatureKeys">Temperature keys</Label>
                    <Input
                      id="temperatureKeys"
                      value={form.temperatureKeys ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, temperatureKeys: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="humidityKeys">Humidity keys</Label>
                    <Input
                      id="humidityKeys"
                      value={form.humidityKeys ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, humidityKeys: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phKeys">pH keys</Label>
                    <Input
                      id="phKeys"
                      value={form.phKeys ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, phKeys: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="timestampKeys">Timestamp keys</Label>
                    <Input
                      id="timestampKeys"
                      value={form.timestampKeys ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, timestampKeys: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2 flex flex-wrap gap-2">
                    <Button type="submit">Save mapping</Button>
                    <Button type="button" variant="outline" onClick={exportSchemaJson}>
                      Export mapping + sample events (JSON)
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Link a Google Doc</CardTitle>
              <CardDescription>
                Paste a document ID from the URL{" "}
                <code className="text-xs bg-muted px-1 rounded">…/document/d/DOC_ID/edit</code>. Full
                Drive API sync needs OAuth in your backend; this link opens the doc for your team and
                anchors operational context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={linkGoogleDoc} className="space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label htmlFor="gdoc">Document ID</Label>
                  <Input
                    id="gdoc"
                    placeholder="e.g. 1AbCdEfGhIjKlMnOpQrStUvWxYz"
                    value={googleDocId}
                    onChange={(e) => setGoogleDocId(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="glabel">Label</Label>
                  <Input
                    id="glabel"
                    value={googleLabel}
                    onChange={(e) => setGoogleLabel(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">Save link</Button>
                  {linkedDoc && (
                    <>
                      <Button type="button" variant="secondary" asChild>
                        <a
                          href={`https://docs.google.com/document/d/${linkedDoc.documentId}/edit`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open in Google Docs
                        </a>
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => void unlinkGoogleDoc()}>
                        Clear
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Workspace automation</CardTitle>
              <CardDescription>
                For programmatic read/write (tables, mail merge, Apps Script), use the official Google
                Docs API with a service account or user OAuth consent.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href="https://developers.google.com/workspace/docs/api/how-tos/overview"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Docs API overview
                </a>{" "}
                — pair with the JSON schema from{" "}
                <strong className="text-foreground">Data modelling → Export</strong> to keep lab
                notebooks aligned with live telemetry.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
