import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { loadFarmSnapshotForUser, loadFarmSnapshotWithFallback } from "@/lib/farm-db";
import { buildMurimiFarmContext, buildMurimiSystemPrompt } from "@/lib/murimi-farm-context";
import type { FarmSnapshot } from "@/lib/farm-data";

const chatInputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(16_000),
      }),
    )
    .max(20),
  /** Raw base64 without data URL prefix */
  imageBase64: z.string().max(2_800_000).optional(),
  imageMimeType: z.string().max(64).optional(),
  /** Supabase session JWT — loads fresh workspace data on every message */
  accessToken: z.string().max(8192).optional(),
});

function getEnv(name: string): string | undefined {
  try {
    const v = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[name];
    if (v) return v;
  } catch {
    /* ignore */
  }
  if (typeof process !== "undefined" && process.env?.[name]) {
    return process.env[name];
  }
  return undefined;
}

/** Google AI Studio / Gemini API key */
function getGeminiApiKey(): string | undefined {
  return getEnv("MURIMI_GEMINI_API_KEY") ?? getEnv("GEMINI_API_KEY");
}

function getGeminiModel(): string {
  return getEnv("MURIMI_GEMINI_MODEL") ?? "gemini-flash-latest";
}

function getOpenAIApiKey(): string | undefined {
  return getEnv("MURIMI_OPENAI_API_KEY") ?? getEnv("OPENAI_API_KEY");
}

function getOpenAIModel(): string {
  return getEnv("MURIMI_AI_MODEL") ?? "gpt-4o-mini";
}

function getOpenAIBaseUrl(): string {
  const u = getEnv("MURIMI_AI_BASE_URL") ?? "https://api.openai.com/v1";
  return u.replace(/\/$/, "");
}

async function loadMurimiFarmSnapshot(accessToken?: string): Promise<FarmSnapshot> {
  const token = accessToken?.trim();
  if (token) {
    return loadFarmSnapshotForUser(token);
  }
  return loadFarmSnapshotWithFallback();
}

function demoReply(
  messages: { role: "user" | "assistant"; content: string }[],
  hasImage: boolean,
  farmContext: string,
): string {
  const last = messages.filter((m) => m.role === "user").pop()?.content?.toLowerCase() ?? "";

  if (hasImage) {
    return `Makadii murimi — thank you for sharing a leaf photo with Murimi AI.

To unlock **camera-based leaf health and disease hints**, set **MURIMI_GEMINI_API_KEY** or **GEMINI_API_KEY** (Google AI Studio) on the server, or **MURIMI_OPENAI_API_KEY** / **OPENAI_API_KEY** for OpenAI.

Until then, here is quick guidance: look for **uniform yellowing** (nutrition or water), **mottled leaves** (viral suspects—confirm in field), **angular spots** (fungal/bacterial—extension can advise), **fine webbing** (mites), **honeydew or sooty mould** (sap feeders), and **chewed margins** (caterpillars or beetles). Sharp photos in natural light, with leaf upper and lower surfaces, help experts a lot.

What crop is this, and what have you noticed in the last few days?`;
  }

  const contextHint = farmContext.includes("### Alerts")
    ? "\n\nI can see your current Verdant alerts and plot readings in the workspace — ask me about any warning or field by name."
    : "";

  if (/hello|hi |hey|makadii|mhoro/.test(last)) {
    return `Makadii murimi! Murimi AI is here to help with your fields—irrigation, crop stages, odd leaves, thresholds, or sensor readings.${contextHint} What is on your mind today?`;
  }
  if (/irrigat|water|moist|dry|rain/.test(last)) {
    return `Water stress often shows up in soil probes before the crop screams. If moisture is trending down and the forecast is dry, consider shorter, more frequent irrigations to refill the root zone without runoff. Match depth to crop stage—shallow roots in early growth, deeper later. Tell me your crop and whether you drip, pivot, or flood, and we can reason through timing.`;
  }
  if (/maize|corn|tomato|wheat|lettuce|citrus|crop/.test(last)) {
    return `Good question. Each crop has different critical periods—for grain it is flowering and grain fill; for tomatoes it is flowering and fruit set; for leafy greens it is steady moisture without leaf wetness overnight. Share your variety, growth stage, and any sensor or scouting notes, and Murimi AI can narrow recommendations.`;
  }
  if (/disease|pest|fungus|mildew|rust|blight|worm/.test(last)) {
    return `Pests and diseases are easiest to manage when caught early. Scout the **lower canopy** and **field edges** first. Note pattern: random spots often mean insects; uniform stripes can be nutrition or machinery; spreading blotches with humidity suggest fungi. If you can describe colour, pattern, and upper vs lower leaf, I can suggest what to rule in or out before you call extension.`;
  }
  if (/fertil|nitr|phosph|potash|nutrient/.test(last)) {
    return `Nutrient decisions work best with soil or leaf tests, but general rules still help: yellow older leaves often point to **nitrogen** shortage; purple or stunted roots can hint at **phosphorus**; marginal burn on older leaves can be **potassium**. Always follow local recommendations and product labels. What crop and growth stage are you feeding?`;
  }
  if (/sensor|probe|threshold|alert|arduino|webhook/.test(last)) {
    return `Sensors are most useful when thresholds match crop stage—Verdant can help you think through moisture floors and heat stress. Configure **Thresholds** (plot ranges) and **Zapier webhooks per node**, then use **Send to Zapier** on AI cards. Telemetry can still POST to \`/api/integrations/ingest\`. What channel is misbehaving—moisture, temperature, or connectivity?`;
  }

  if (farmContext.length > 200) {
    return `Thank you for reaching out. I have your latest Verdant workspace loaded — plots, alerts, sensors, and recommendations. Tell me which **field or alert** you want to act on (irrigate, scout, dismiss a warning, etc.) and I will reason from your live numbers.${contextHint}`;
  }

  return `Thank you for reaching out. Murimi AI works best with a bit of context: which **field or crop**, what you **see or measure**, and what you **want to decide** (irrigate, spray, wait, scout, etc.). Share that and we will work through it step by step.`;
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

function toGeminiContents(messages: { role: "user" | "assistant"; content: string }[]): GeminiContent[] {
  const trimmed = [...messages];
  while (trimmed.length > 0 && trimmed[0].role === "assistant") {
    trimmed.shift();
  }
  const out: GeminiContent[] = [];
  for (const m of trimmed) {
    out.push({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    });
  }
  return out;
}

async function callGemini(
  messages: { role: "user" | "assistant"; content: string }[],
  imageBase64: string | undefined,
  imageMimeType: string | undefined,
  apiKey: string,
  systemPrompt: string,
): Promise<{ reply: string; mode: "gemini" } | { error: string }> {
  const contents = toGeminiContents(messages);
  if (contents.length === 0) {
    return { error: "gemini_empty_contents" };
  }

  if (imageBase64) {
    const mime = imageMimeType?.startsWith("image/") ? imageMimeType : "image/jpeg";
    const lastUser = [...contents].reverse().find((c) => c.role === "user");
    if (lastUser) {
      const textPart = lastUser.parts.find((p): p is { text: string } => "text" in p);
      const baseText =
        textPart?.text?.trim() ||
        "Please analyse this crop leaf image for visible health, stress, or disease signs.";
      lastUser.parts = [{ text: baseText }, { inlineData: { mimeType: mime, data: imageBase64 } }];
    }
  }

  const model = getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.45,
      },
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    return { error: `gemini_http_${res.status}: ${rawText.slice(0, 500)}` };
  }

  let json: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    error?: { message?: string; code?: number };
  };
  try {
    json = JSON.parse(rawText) as typeof json;
  } catch {
    return { error: "gemini_invalid_json" };
  }

  if (json.error?.message) {
    return { error: `gemini_api: ${json.error.message}` };
  }

  const parts = json.candidates?.[0]?.content?.parts;
  const reply = parts?.map((p) => p.text ?? "").join("").trim();
  if (!reply) {
    return { error: `gemini_no_text:${json.candidates?.[0]?.finishReason ?? "unknown"}` };
  }
  return { reply, mode: "gemini" };
}

type OpenAIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

async function callOpenAI(
  messages: { role: "user" | "assistant"; content: string }[],
  imageBase64: string | undefined,
  imageMimeType: string | undefined,
  systemPrompt: string,
): Promise<{ reply: string; mode: "openai" } | { error: string }> {
  const key = getOpenAIApiKey();
  if (!key) {
    return { error: "missing_key" };
  }

  const apiMessages: { role: "system" | "user" | "assistant"; content: string | OpenAIContentPart[] }[] =
    [{ role: "system", content: systemPrompt }];

  for (const m of messages) {
    apiMessages.push({ role: m.role, content: m.content });
  }

  if (imageBase64) {
    const mime = imageMimeType?.startsWith("image/") ? imageMimeType : "image/jpeg";
    const lastUser = apiMessages.filter((x) => x.role === "user").pop();
    if (lastUser && typeof lastUser.content === "string") {
      const text =
        lastUser.content.trim() || "Please analyse this crop leaf image for visible stress or disease signs.";
      lastUser.content = [
        { type: "text", text },
        {
          type: "image_url",
          image_url: { url: `data:${mime};base64,${imageBase64}`, detail: "low" },
        },
      ];
    }
  }

  const res = await fetch(`${getOpenAIBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel(),
      messages: apiMessages,
      max_tokens: 900,
      temperature: 0.45,
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { error: `openai_http_${res.status}: ${t.slice(0, 400)}` };
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const reply = json.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    return { error: "openai_empty_response" };
  }
  return { reply, mode: "openai" };
}

async function callLLM(
  messages: { role: "user" | "assistant"; content: string }[],
  imageBase64: string | undefined,
  imageMimeType: string | undefined,
  systemPrompt: string,
): Promise<{ reply: string; mode: "gemini" | "openai" } | { error: "missing_key" } | { error: string }> {
  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
    const g = await callGemini(messages, imageBase64, imageMimeType, geminiKey, systemPrompt);
    if ("error" in g) {
      return { error: g.error };
    }
    return g;
  }

  const o = await callOpenAI(messages, imageBase64, imageMimeType, systemPrompt);
  if ("error" in o) {
    if (o.error === "missing_key") {
      return { error: "missing_key" };
    }
    return { error: o.error };
  }
  return o;
}

export const murimiChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => chatInputSchema.parse(d))
  .handler(async ({ data }) => {
    const { messages, imageBase64, imageMimeType, accessToken } = data;

    const snapshot = await loadMurimiFarmSnapshot(accessToken);
    const systemPrompt = buildMurimiSystemPrompt(snapshot);
    const farmContext = buildMurimiFarmContext(snapshot);

    const result = await callLLM(messages, imageBase64, imageMimeType, systemPrompt);

    if ("error" in result) {
      if (result.error === "missing_key") {
        return {
          mode: "demo" as const,
          reply: demoReply(messages, Boolean(imageBase64), farmContext),
        };
      }
      return {
        mode: "error" as const,
        reply:
          "Murimi AI could not reach the model just now. Please try again in a moment, or check your API key and quotas.",
        detail: result.error,
      };
    }

    return { mode: result.mode, reply: result.reply };
  });
