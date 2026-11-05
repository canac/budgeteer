import repl from "node:repl";
import "./loadEnv.ts";
import { getPrisma } from "./src/lib/prisma.ts";

const replServer = repl.start();
const prisma = getPrisma();

replServer.context.prisma = prisma;
Object.entries(prisma)
  .filter(([key]) => /^[a-z]/.test(key))
  .forEach(([key, value]) => {
    if (/^[a-z]/.test(key) && key !== "constructor") {
      // oxlint-disable-next-line typescript/no-unsafe-assignment
      replServer.context[key] = value;
    }
  });
