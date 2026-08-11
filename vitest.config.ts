import path from "path";
import { defineConfig } from "vitest/config";

// F-TEST (audit 2026-08-11): kept deliberately separate from vite.config.ts
// rather than merging into it, so the production build config is never at
// risk of picking up test-only settings by accident. Only the "@" alias is
// duplicated here — everything else (build output, chunking, server) stays
// exclusively in vite.config.ts.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "server/**/*.test.ts"],
  },
});
