import { cloudflare } from "@cloudflare/vite-plugin";
import transformImports from "@rolldown/plugin-transform-imports";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import "./loadEnv.ts";

if (process.env.DATABASE_URL) {
  const localDatabaseUrl = new URL(process.env.DATABASE_URL);
  // Local Hyperdrive rejects URLs without a password or port
  localDatabaseUrl.password ||= "local";
  localDatabaseUrl.port ||= "5432";
  process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE ??=
    localDatabaseUrl.toString();
}

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

const prismaDir = path.resolve("src/prisma") + path.sep;
const workerdPrismaDir = path.resolve("src/prisma-workerd") + path.sep;

// Swap out the Prisma client for workerd
const workerdPrisma: Plugin = {
  name: "workerd-prisma",
  enforce: "pre",
  async resolveId(source, importer, options) {
    if (this.environment.name !== "ssr") {
      return null;
    }
    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
    if (resolved?.id.startsWith(prismaDir)) {
      return { ...resolved, id: workerdPrismaDir + resolved.id.slice(prismaDir.length) };
    }
    return resolved;
  },
};

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
    workerdPrisma,
    tablerImports,
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    react(),
  ],
});
