import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { createExternalTransaction, transaction } from "../../test/mocks.ts";
import { acknowledgeTransactionChange } from "./acknowledgeTransactionChange.ts";

describe("acknowledgeTransactionChange", () => {
  const prisma = getPrisma();

  it("clears the changedAt flag", async () => {
    const source = await createExternalTransaction({
      reviewed: true,
      changedAt: new Date(),
      transaction: { create: transaction() },
    });

    await acknowledgeTransactionChange({ data: { id: source.id } });

    const updated = await prisma.externalTransaction.findUniqueOrThrow({
      where: { id: source.id },
    });
    expect(updated.changedAt).toBeNull();
  });
});
