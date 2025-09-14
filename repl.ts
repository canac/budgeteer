import repl from "node:repl";
import { prisma } from "./src/lib/prisma.ts";

const r = repl.start();

r.context.prisma = prisma;
Object.entries(prisma)
  .filter(([key]) => /^[a-z]/.test(key))
  .forEach(([key, value]) => {
    if (/^[a-z]/.test(key) && key !== "constructor") {
      r.context[key] = value;
    }
  });
