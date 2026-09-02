import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(root, "src") },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173 },
  build: {
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Vendor groups are split so the map and chart libraries are only
        // downloaded by the routes that use them (pages are lazy-loaded).
        manualChunks: {
          react: ["react", "react-dom", "react-router"],
          query: ["@tanstack/react-query", "axios"],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
          map: ["leaflet", "react-leaflet", "react-leaflet-cluster"],
          charts: ["recharts"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    restoreMocks: true,
    clearMocks: true,
  },
});
