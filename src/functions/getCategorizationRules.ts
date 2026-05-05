import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

export const getCategorizationRules = createServerFn()
  .middleware([requireAuth])
  .handler(() =>
    prisma.categorizationRule.findMany({
      orderBy: { tellerVendor: "asc" },
      include: { category: true },
    }),
  );
