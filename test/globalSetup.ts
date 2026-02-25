import type { TestProject } from "vitest/node";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { connect } from "./helpers";

const execAsync = promisify(exec);

declare module "vitest" {
  export interface ProvidedContext {
    schema: string;
  }
}

export async function setup(project: TestProject) {
  const schema = `test_${crypto.randomUUID().replace(/-/g, "")}`;

  const url = new URL(import.meta.env.VITE_DATABASE_URL);
  url.searchParams.set("schema", schema);
  const connectionString = url.toString();

  await execAsync("pnpm db:push", {
    env: { ...process.env, VITE_DATABASE_URL: connectionString },
  });

  const prisma = connect(schema);
  project.provide("schema", schema);

  return async () => {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
    await prisma.$disconnect();
  };
}
