import { globSync } from "node:fs"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === "build" ? "/vite/" : "/",
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    origin: "http://localhost:5173",
    cors: { origin: "http://localhost:3000" },
  },
  build: {
    outDir: "public/vite",
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: [...globSync("app/client/entrypoints/*.{ts,tsx}"), "app/assets/stylesheets/application.css"],
    },
  },
}))
