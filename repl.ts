import repl from "node:repl";
import "./loadEnv.ts";
import { getPrisma } from "./src/lib/prisma.ts";

const r = repl.start();
const prisma = getPrisma();

r.context.prisma = prisma;
Object.entries(prisma)
  .filter(([key]) => /^[a-z]/.test(key))
  .forEach(([key, value]) => {
    if (/^[a-z]/.test(key) && key !== "constructor") {
      // oxlint-disable-next-line typescript/no-unsafe-assignment
      r.context[key] = value;
    }
  });
