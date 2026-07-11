import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

export const getUnreviewedTransactionCount = createServerFn()
  .middleware([requireAuth])
  .handler(() =>
    prisma.externalTransaction.count({
      where: {
        // Transactions awaiting review or accepted ones flagged as changed at the bank
        OR: [{ reviewed: false }, { changedAt: { not: null }, transaction: { isNot: null } }],
      },
    }),
  );
