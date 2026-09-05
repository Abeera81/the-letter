import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    // Node environment covers the load-bearing tests: span gate, schema, normalize,
    // prompt isolation. Component/accessibility tests arrive around P5 and will be
    // added as a second `projects` entry using jsdom, so this config is written once.
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
