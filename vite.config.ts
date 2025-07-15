import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react(), tsconfigPaths()],
    server: {
      port: parseInt(env.VITE_DEV_SERVER_PORT || '5173'),
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL || "http://localhost:8081",
          changeOrigin: true,
        },
        "/uploads": {
          target: env.VITE_API_BASE_URL || "http://localhost:8081",
          changeOrigin: true,
        },
      },
    },
  };
});
