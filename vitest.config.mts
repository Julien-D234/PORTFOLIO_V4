import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    maxWorkers: 3,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
