import { PrismaPg } from "@prisma/adapter-pg";
import { inject } from "vitest";
import { PrismaClient } from "../generated/prisma/client.ts";

let prisma: PrismaClient | null = null;

export function connect(schema: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: import.meta.env.VITE_DATABASE_URL }, { schema });
  return new PrismaClient({ adapter });
}

export function getPrisma(): PrismaClient {
  if (prisma) {
    return prisma;
  }

  prisma = connect(inject("schema"));
  return prisma;
}

export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export async function resetDatabase() {
  const prisma = getPrisma();

  const schema = inject("schema");
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename::text
    FROM pg_tables
    WHERE schemaname = ${schema}
    AND tablename != '_prisma_migrations'
  `;

  if (tables.length > 0) {
    const tableNames = tables.map(({ tablename }) => `"${schema}"."${tablename}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`);
  }
}
