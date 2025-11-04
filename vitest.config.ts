import tsConfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./test/globalSetup.ts"],
    setupFiles: ["./test/testSetup.ts"],
  },
  plugins: [tsConfigPaths({ projects: ["./tsconfig.json"] })],
});
