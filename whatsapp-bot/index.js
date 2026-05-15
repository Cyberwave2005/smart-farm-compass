import qrcodeTerminal from "qrcode-terminal";
import pkg from "whatsapp-web.js";

import { appendTurn, getHistory } from "./src/chat-store.js";
import { loadEnv } from "./src/env.js";
import {
  buildGreetingReply,
  buildUnlinkedReply,
  loadFarmerWorkspace,
  workspaceToContextText,
} from "./src/farm-context.js";
import { fallbackReply, replyWithGemini } from "./src/gemini.js";
import { helpReply, isGreeting, isHelp, wantsSummary } from "./src/intents.js";
import { digitsFromWhatsAppId } from "./src/phone.js";
import { createServiceClient, resolveFarmerUserId } from "./src/supabase.js";
import {
  buildWhatsAppClientOptions,
  initializeWithRetry,
  warnIfNodeUnsupported,
} from "./src/whatsapp-client.js";

const { Client, LocalAuth } = pkg;

const config = loadEnv();
const supabase = createServiceClient(config.supabaseUrl, config.supabaseServiceKey);

/** @type {Map<string, { userId: string, displayName: string|null, contextText: string, workspace: object }>} */
const farmerCache = new Map();

async function getFarmerBundle(waFrom) {
  const cached = farmerCache.get(waFrom);
  if (cached) return cached;

  const digits = digitsFromWhatsAppId(waFrom);
  const { userId, displayName } = await resolveFarmerUserId(supabase, digits, config.devFarmerUserId);

  if (!userId) {
    return { userId: null, displayName: null, workspace: null, contextText: "", digits };
  }

  const workspace = await loadFarmerWorkspace(supabase, userId);
  const contextText = workspaceToContextText(workspace, displayName);
  const bundle = { userId, displayName, workspace, contextText, digits };
  farmerCache.set(waFrom, bundle);
  return bundle;
}

async function handleMessage(msg) {
  if (msg.fromMe) return;
  if (msg.isStatus) return;
  const chat = await msg.getChat();
  if (chat.isGroup && process.env.WHATSAPP_ALLOW_GROUPS !== "1") return;

  const body = (msg.body ?? "").trim();
  if (!body) return;

  const waFrom = msg.from;
  const chatId = msg.from;

  try {
    if (isHelp(body)) {
      await msg.reply(helpReply());
      return;
    }

    const bundle = await getFarmerBundle(waFrom);

    if (!bundle.userId) {
      await msg.reply(buildUnlinkedReply(bundle.digits));
      return;
    }

    const { workspace, displayName, contextText } = bundle;

    if (isGreeting(body) || wantsSummary(body)) {
      const reply = buildGreetingReply(workspace, displayName);
      await msg.reply(reply);
      appendTurn(chatId, "user", body);
      appendTurn(chatId, "assistant", reply);
      return;
    }

    appendTurn(chatId, "user", body);
    const history = getHistory(chatId);

    let reply;
    if (config.geminiApiKey) {
      const gem = await replyWithGemini({
        apiKey: config.geminiApiKey,
        model: config.geminiModel,
        farmContextText: contextText,
        history,
        userMessage: body,
      });
      reply = gem.text ?? fallbackReply(body);
      if (gem.error) console.warn("[whatsapp-bot] Gemini:", gem.error, "— using fallback");
    } else {
      reply = fallbackReply(body);
    }

    await msg.reply(reply);
    appendTurn(chatId, "assistant", reply);
  } catch (err) {
    console.error("[whatsapp-bot] message error", err);
    await msg.reply(
      "Sorry murimi — I could not fetch your farm data just now. Please try again in a minute.",
    );
  }
}

const clientOpts = buildWhatsAppClientOptions();
const client = new Client({
  ...clientOpts,
  authStrategy: new LocalAuth({ dataPath: ".wwebjs_auth" }),
});

client.on("qr", (qr) => {
  console.log("\n[whatsapp-bot] Scan this QR with WhatsApp → Linked devices:\n");
  qrcodeTerminal.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("[whatsapp-bot] Murimi farmer assistant is online.");
  if (config.devFarmerUserId) {
    console.log("[whatsapp-bot] DEV_FARMER_USER_ID is set — all chats use that workspace.");
  }
});

client.on("auth_failure", (msg) => {
  console.error("[whatsapp-bot] Auth failure:", msg);
});

client.on("message", (msg) => {
  void handleMessage(msg);
});

warnIfNodeUnsupported();
console.log("[whatsapp-bot] Starting…");
void initializeWithRetry(client).catch((err) => {
  console.error("[whatsapp-bot] Could not start:", err?.message ?? err);
  console.error(
    "[whatsapp-bot] Try: npm run reset-auth   then   npm start\n" +
      "       Or switch to Node 20: nvm use 20",
  );
  process.exit(1);
});
