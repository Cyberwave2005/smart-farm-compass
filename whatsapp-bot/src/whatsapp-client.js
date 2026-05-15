import { rmSync } from "node:fs";
import { join } from "node:path";

import { buildPuppeteerOptions } from "./puppeteer-config.js";

/** Pinned HTML avoids WhatsApp auto-update breaking Puppeteer inject (common crash on Windows). */
const DEFAULT_WA_WEB_HTML =
  "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1039561367-alpha.html";

export function warnIfNodeUnsupported() {
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  if (major >= 22) {
    console.warn(
      "[whatsapp-bot] Node 22+ often crashes whatsapp-web.js. Prefer Node 20 LTS: nvm install 20 && nvm use 20",
    );
  }
}

export function buildWhatsAppClientOptions() {
  const remotePath = process.env.WA_WEB_VERSION_URL?.trim() || DEFAULT_WA_WEB_HTML;

  return {
    puppeteer: buildPuppeteerOptions(),
    webVersionCache: {
      type: "remote",
      remotePath,
    },
    /** Give WhatsApp Web time to settle before inject on slow machines. */
    authTimeoutMs: 120_000,
    qrMaxRetries: 5,
  };
}

export function clearWhatsAppSession(cwd = process.cwd()) {
  for (const dir of [".wwebjs_auth", ".wwebjs_cache"]) {
    const path = join(cwd, dir);
    try {
      rmSync(path, { recursive: true, force: true });
      console.log(`[whatsapp-bot] Removed ${dir}`);
    } catch (err) {
      console.warn(`[whatsapp-bot] Could not remove ${dir}:`, err.message);
    }
  }
}

export async function initializeWithRetry(client, { maxAttempts = 3, resetSessionOnFailure = true } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[whatsapp-bot] Retry ${attempt}/${maxAttempts}…`);
        await new Promise((r) => setTimeout(r, 3000 * attempt));
      }
      await client.initialize();
      return;
    } catch (err) {
      lastError = err;
      const msg = err?.message ?? String(err);
      const recoverable =
        /execution context was destroyed|protocol error|navigation/i.test(msg);

      console.error(`[whatsapp-bot] Initialize failed (attempt ${attempt}):`, msg);

      if (!recoverable || attempt >= maxAttempts) break;

      try {
        await client.destroy();
      } catch {
        /* ignore */
      }

      if (resetSessionOnFailure && attempt === 1) {
        console.log("[whatsapp-bot] Clearing session cache and retrying…");
        clearWhatsAppSession();
      }
    }
  }

  throw lastError;
}
