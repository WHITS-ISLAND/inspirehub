import { defineConfig } from "vitest/config";
import { devtools } from "@tanstack/devtools-vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [devtools(), viteReact(), tailwindcss()],
  build: {
    sourcemap: "hidden",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    env: {
      VITE_API_URL: "http://localhost:8787",
      VITE_GOOGLE_CLIENT_ID: "test-google-client-id",
    },
  },
});
