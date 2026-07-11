import { createExternalTransaction, transaction } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { restoreTransaction } from "./restoreTransaction.ts";

describe("restoreTransaction", () => {
  const prisma = getPrisma();

  it("marks the transaction as unreviewed", async () => {
    const external = await createExternalTransaction({ reviewed: true });

    await restoreTransaction({ data: { id: external.id } });

    const updated = await prisma.externalTransaction.findUniqueOrThrow({
      where: { id: external.id },
    });
    expect(updated.reviewed).toBe(false);
  });

  it("skips accepted transactions", async () => {
    const external = await createExternalTransaction({
      reviewed: true,
      transaction: { create: transaction() },
    });

    await expect(() => restoreTransaction({ data: { id: external.id } })).rejects.toThrow(
      "No record was found for an update.",
    );

    const unchanged = await prisma.externalTransaction.findUniqueOrThrow({
      where: { id: external.id },
    });
    expect(unchanged.reviewed).toBe(true);
  });
});
