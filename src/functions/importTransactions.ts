import { createServerFn } from "@tanstack/react-start";
import { syncConnection } from "src/lib/plaid/sync";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

export const importTransactions = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async () => {
    const connections = await prisma.externalConnection.findMany({
      where: { OR: [{ accounts: { none: {} } }, { accounts: { some: { enabled: true } } }] },
      include: { accounts: true },
    });
    const results = await Promise.allSettled(connections.map(syncConnection));
    const imported = results.reduce(
      (sum, result) => sum + (result.status === "fulfilled" ? result.value.imported : 0),
      0,
    );
    const failed = results.filter((result) => result.status === "rejected").length;
    return { imported, failed };
  });
