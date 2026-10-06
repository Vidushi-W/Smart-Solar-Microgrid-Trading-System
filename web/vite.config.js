import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      open: false,
      proxy: {
        "/reservation-api": {
          target: env.VITE_DEV_RESERVATION_PROXY_TARGET || "http://localhost:5251",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/reservation-api/, "/api"),
        },
        "/api": {
          target: env.VITE_DEV_API_PROXY_TARGET || "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
  };
});
