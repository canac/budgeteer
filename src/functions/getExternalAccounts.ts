import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

export const getExternalAccounts = createServerFn()
  .middleware([requireAuth])
  .handler(() =>
    prisma.externalAccount.findMany({
      orderBy: [{ institution: "asc" }, { name: "asc" }],
    }),
  );
