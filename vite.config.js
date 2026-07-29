import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // Локально приложение открывается с корня: /
  // На GitHub Pages workflow передаст путь вида /название-репозитория/
  base: process.env.BASE_PATH || "/",

  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
