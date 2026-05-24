import { createTellerTransaction, transaction } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { restoreTransaction } from "./restoreTransaction.ts";

describe("restoreTransaction", () => {
  const prisma = getPrisma();

  it("marks the transaction as unreviewed", async () => {
    const teller = await createTellerTransaction({ reviewed: true });

    await restoreTransaction({ data: { id: teller.id } });

    const updated = await prisma.tellerTransaction.findUniqueOrThrow({ where: { id: teller.id } });
    expect(updated.reviewed).toBe(false);
  });

  it("skips accepted transactions", async () => {
    const teller = await createTellerTransaction({
      reviewed: true,
      transaction: { create: transaction() },
    });

    await expect(() => restoreTransaction({ data: { id: teller.id } })).rejects.toThrow(
      "No record was found for an update.",
    );

    const unchanged = await prisma.tellerTransaction.findUniqueOrThrow({
      where: { id: teller.id },
    });
    expect(unchanged.reviewed).toBe(true);
  });
});
