import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

export const getUnreviewedTransactionCount = createServerFn()
  .middleware([requireAuth])
  .handler(() => prisma.tellerTransaction.count({ where: { reviewed: false } }));
