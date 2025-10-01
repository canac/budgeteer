import netlify from "@netlify/vite-plugin-tanstack-start";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: parseInt(process.env.PORT ?? "", 10) || 3000,
  },
  plugins: [react(), tsConfigPaths({ projects: ["./tsconfig.json"] }), tanstackStart(), netlify()],
});
