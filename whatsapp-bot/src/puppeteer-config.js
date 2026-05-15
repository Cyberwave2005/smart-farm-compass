import { existsSync } from "node:fs";

const WINDOWS_CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA
    ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
    : null,
];

const MAC_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

const LINUX_CHROME_PATHS = [
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

function firstExisting(paths) {
  for (const p of paths) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

/** Resolve Chrome for Puppeteer (option 2: local browser, not bundled Chromium). */
export function resolveChromeExecutable() {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (fromEnv) {
    if (!existsSync(fromEnv)) {
      console.warn(`[whatsapp-bot] PUPPETEER_EXECUTABLE_PATH not found: ${fromEnv}`);
    } else {
      return fromEnv;
    }
  }

  if (process.platform === "win32") return firstExisting(WINDOWS_CHROME_PATHS);
  if (process.platform === "darwin") return firstExisting(MAC_CHROME_PATHS);
  return firstExisting(LINUX_CHROME_PATHS);
}

export function buildPuppeteerOptions() {
  const executablePath = resolveChromeExecutable();
  const options = {
    headless: true,
    timeout: 120_000,
    protocolTimeout: 120_000,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-blink-features=AutomationControlled",
    ],
  };

  if (executablePath) {
    options.executablePath = executablePath;
    console.log(`[whatsapp-bot] Using Chrome: ${executablePath}`);
  } else {
    console.warn(
      "[whatsapp-bot] Chrome not found. Set PUPPETEER_EXECUTABLE_PATH in .env " +
        "(e.g. C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe)",
    );
  }

  return options;
}
