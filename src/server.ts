import handler from "@tanstack/react-start/server-entry";
import { env } from "cloudflare:workers";
import { importAllTransactions } from "./lib/plaid/importAll.ts";
import { withRequestPrisma } from "./lib/prisma.ts";

export default {
  fetch(request) {
    return handler.fetch(request);
  },

  async scheduled() {
    await withRequestPrisma(env.HYPERDRIVE.connectionString, importAllTransactions);
  },
} satisfies ExportedHandler<Env>;
