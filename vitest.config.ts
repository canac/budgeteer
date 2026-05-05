import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./test/globalSetup.ts"],
    setupFiles: ["./test/testSetup.ts"],
    isolate: false,
    pool: "forks",
  },
  resolve: {
    tsconfigPaths: true,
  },
});
