import "dotenv/config";
import { exec } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { Client } from "pg";

const execAsync = promisify(exec);
const CACHE_DIR = path.join(process.cwd(), "node_modules", ".cache", "vitest-db");

export async function setup() {
  const runId = randomUUID().replace(/-/g, "").slice(0, 12);
  await mkdir(CACHE_DIR, { recursive: true });

  const { stdout: ddl } = await execAsync(
    "pnpm prisma migrate diff --from-empty --to-schema ./prisma/schema.prisma --script",
  );
  const ddlPath = path.join(CACHE_DIR, `${runId}.sql`);
  await writeFile(ddlPath, ddl);

  process.env.TEST_RUN_ID = runId;
  process.env.TEST_DDL_PATH = ddlPath;

  return async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const { rows } = await client.query<{ schema_name: string }>(
        `SELECT schema_name::text FROM information_schema.schemata
         WHERE schema_name LIKE $1`,
        [`test_${runId}_%`],
      );
      for (const { schema_name } of rows) {
        await client.query(`DROP SCHEMA IF EXISTS "${schema_name}" CASCADE`);
      }
    } finally {
      await client.end();
    }
    await rm(ddlPath, { force: true });
  };
}
