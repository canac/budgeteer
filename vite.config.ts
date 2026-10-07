import netlify from "@netlify/vite-plugin-tanstack-start";
import transformImports from "@rolldown/plugin-transform-imports";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const tablerImports = transformImports({
  "@tabler/icons-react": {
    transform: "@tabler/icons-react/dist/esm/icons/{{member}}.mjs",
  },
});
// The default id filter rejects TanStack Router's split route modules like `route.tsx?tsr-split=component`
const { transform } = tablerImports;
if (typeof transform === "object" && transform.filter && !Array.isArray(transform.filter)) {
  transform.filter.id = /\.[jt]sx?(\?.*)?$/;
}

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
  plugins: [
    tablerImports,
    tanstackStart(),
    react(),
    // Edge functions dev server is broken with Deno 2.9 https://github.com/netlify/framework-adapters/issues/67
    netlify({ dev: { edgeFunctions: { enabled: false } } }),
  ],
});
