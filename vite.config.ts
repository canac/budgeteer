import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: parseInt(process.env.PORT ?? "", 10) || 3000,
  },
  plugins: [
    react(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({ customViteReactPlugin: true }),
  ],
});
