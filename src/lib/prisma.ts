import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../~/prisma/client.ts";

const adapter = new PrismaPg({
  connectionString: process.env.VITE_DATABASE_URL ?? import.meta.env.VITE_DATABASE_URL,
});
export const prisma = new PrismaClient({ adapter });
