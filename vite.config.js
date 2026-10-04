import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// In development, requests to /api go to the backend (open5e-backend), so the browser only talks to this dev server
// and the backend needs no CORS settings. Point VITE_API_PROXY_TARGET elsewhere in .env.local if needed.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.js",
      // The editor tests render a lot of form; on a slow machine (a CI runner with two CPUs) a few take over the default
      // five seconds, though nothing is wrong.
      testTimeout: 20000,
    },
  };
});
