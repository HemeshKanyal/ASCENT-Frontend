import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// The site imports the app's engine directly so demos and anatomy stay in sync.
const engine = fileURLToPath(new URL("../src/engine", import.meta.url));

// Link previews (WhatsApp, X, LinkedIn) need an absolute image URL. Vercel
// exposes the production domain at build time; SITE_URL overrides it.
const host = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) || "";

export default defineConfig({
  resolve: { alias: { "@engine": engine } },
  server: { fs: { allow: [".."] } },
  build: { target: "es2022", chunkSizeWarningLimit: 900 },
  plugins: [
    {
      name: "absolute-og-image",
      transformIndexHtml: (html) => html.replaceAll('content="/og.jpg"', `content="${host.replace(/\/$/, "")}/og.jpg"`),
    },
  ],
});
