import { createServerFn } from "@tanstack/react-start";
import { syncEnrollment } from "src/lib/teller/sync";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

export const importTransactions = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async () => {
    const enrollments = await prisma.tellerEnrollment.findMany({ include: { accounts: true } });
    const results = await Promise.all(enrollments.map(syncEnrollment));
    return results.reduce((sum, { imported }) => sum + imported, 0);
  });
