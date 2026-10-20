import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { getPrisma } from "~/lib/prisma";

export const getExternalAccounts = createServerFn()
  .middleware([requireAuth])
  .handler(() =>
    getPrisma().externalAccount.findMany({
      orderBy: [{ archived: "asc" }, { institution: "asc" }, { name: "asc" }],
    }),
  );
