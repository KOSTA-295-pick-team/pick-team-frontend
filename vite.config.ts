import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  server: {
    open: true,
    port: 3000,
  },
  build: {
    outDir: "build",
  },
  preview: {
    open: true,
    port: 3000,
  },
});
