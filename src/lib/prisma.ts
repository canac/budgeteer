import { PrismaPg } from "@prisma/adapter-pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaClient } from "../prisma/client.ts";

// Cloudflare Workers can't reuse a socket across requests, so give each request its own client
const requestPrisma = new AsyncLocalStorage<PrismaClient>();
let globalPrisma: PrismaClient | undefined;

function createPrisma(connectionString: string | undefined): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Runs `callback` with a Prisma client scoped to the current request. */
export function withRequestPrisma<T>(connectionString: string, callback: () => T): T {
  return requestPrisma.run(createPrisma(connectionString), callback);
}

/** Returns the current client. */
export function getPrisma(): PrismaClient {
  const prisma = requestPrisma.getStore();
  if (prisma) {
    return prisma;
  }

  globalPrisma ??= createPrisma(process.env.DATABASE_URL);
  return globalPrisma;
}
