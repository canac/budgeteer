import { PrismaPg } from "@prisma/adapter-pg";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { PrismaClient } from "~/prisma/client.ts";

export const workerSchema = `test_${process.env.TEST_RUN_ID}_${process.env.VITEST_POOL_ID}`;

let prisma: PrismaClient | null = null;
let setupPromise: Promise<void> | null = null;

function workerUrl(): string {
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set("schema", workerSchema);
  return url.toString();
}

export function getPrisma(): PrismaClient {
  if (!prisma) {
    const adapter = new PrismaPg({ connectionString: workerUrl() }, { schema: workerSchema });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

export function setupSchema(): Promise<void> {
  setupPromise ??= (async () => {
    const ddl = await readFile(process.env.TEST_DDL_PATH!, "utf8");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS "${workerSchema}" CASCADE`);
      await client.query(`CREATE SCHEMA "${workerSchema}"`);
      await client.query(`SET search_path TO "${workerSchema}"`);
      await client.query(ddl);
    } finally {
      await client.end();
    }
  })();
  return setupPromise;
}

export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export async function resetDatabase() {
  const prisma = getPrisma();
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename::text
    FROM pg_tables
    WHERE schemaname = ${workerSchema}
    AND tablename != '_prisma_migrations'
  `;

  if (tables.length > 0) {
    const tableNames = tables.map(({ tablename }) => `"${workerSchema}"."${tablename}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`);
  }
}
