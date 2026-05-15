import dotenv from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });
dotenv.config({ path: join(__dirname, "..", "..", ".env") });

const REQUIRED = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

export function loadEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    console.error("[whatsapp-bot] Missing environment variable(s):");
    for (const k of missing) {
      console.error(`  - ${k}`);
    }
    console.error("\nAdd them to whatsapp-bot/.env (see .env.example).");
    process.exit(1);
  }

  return {
    supabaseUrl: process.env.SUPABASE_URL.trim(),
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
    devFarmerUserId: process.env.DEV_FARMER_USER_ID?.trim() || null,
    geminiApiKey: process.env.MURIMI_GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || null,
    geminiModel: process.env.MURIMI_GEMINI_MODEL?.trim() || "gemini-flash-latest",
  };
}
