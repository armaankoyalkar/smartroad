import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    setupFiles: ["tests/setup/env.js"],
    globalSetup: ["tests/setup/globalSetup.js"],
    testTimeout: 20000,
    hookTimeout: 180000,
    reporters: "default",
  },
});
