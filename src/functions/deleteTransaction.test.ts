import { createExternalTransaction, createTransaction, transaction } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { deleteTransaction } from "./deleteTransaction.ts";

describe("deleteTransaction", () => {
  const prisma = getPrisma();

  it("deletes the transaction", async () => {
    const tx = await createTransaction();

    await deleteTransaction({ data: { transactionId: tx.id } });

    const deleted = await prisma.transaction.findUnique({ where: { id: tx.id } });
    expect(deleted).toBeNull();
  });

  it("marks the external transaction unreviewed", async () => {
    const external = await createExternalTransaction({
      reviewed: true,
      transaction: { create: transaction() },
    });
    const tx = await prisma.transaction.findUniqueOrThrow({ where: { externalId: external.id } });

    await deleteTransaction({ data: { transactionId: tx.id } });

    const updated = await prisma.externalTransaction.findUniqueOrThrow({
      where: { id: external.id },
    });
    expect(updated.reviewed).toBe(false);
  });
});
