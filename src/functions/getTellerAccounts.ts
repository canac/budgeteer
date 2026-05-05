import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

export const getTellerAccounts = createServerFn()
  .middleware([requireAuth])
  .handler(() =>
    prisma.tellerAccount.findMany({
      orderBy: [{ institution: "asc" }, { name: "asc" }],
    }),
  );
