// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import netlify from "@netlify/vite-plugin-tanstack-start";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// Netlify: disable Lovable's Cloudflare Worker build; @netlify/vite-plugin-tanstack-start emits Netlify SSR.
// To deploy on Cloudflare again, remove `cloudflare: false` and drop the Netlify plugin from `plugins`.
export default defineConfig({
  cloudflare: false,
  plugins: [netlify()],
  tanstackStart: {
    server: { entry: "server" },
  },
});
