import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup/env.ts"],
    globalSetup: ["tests/setup/globalSetup.ts"],
    testTimeout: 20000,
    hookTimeout: 180000,
    reporters: "default",
  },
});
