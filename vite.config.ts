import netlify from "@netlify/vite-plugin-tanstack-start";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: parseInt(process.env.PORT ?? "", 10) || 3000,
  },
  build: {
    sourcemap: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [tanstackStart(), react(), netlify()],
});
