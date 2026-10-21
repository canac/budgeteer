import { getPrisma } from "~/lib/prisma";
import { syncConnection } from "./sync";

export async function importAllTransactions(): Promise<{ imported: number; failed: number }> {
  const connections = await getPrisma().externalConnection.findMany({
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
}
