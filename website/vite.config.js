import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// The site imports the app's engine directly so demos and anatomy stay in sync.
const engine = fileURLToPath(new URL("../src/engine", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@engine": engine } },
  server: { fs: { allow: [".."] } },
  build: { target: "es2022", chunkSizeWarningLimit: 900 },
});
