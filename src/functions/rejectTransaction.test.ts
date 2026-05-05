import { createTellerTransaction } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { rejectTransaction } from "./rejectTransaction.ts";

describe("rejectTransaction", () => {
  const prisma = getPrisma();

  it("marks the transaction as reviewed", async () => {
    const teller = await createTellerTransaction();

    await rejectTransaction({ data: { id: teller.id } });

    const updated = await prisma.tellerTransaction.findUniqueOrThrow({ where: { id: teller.id } });
    expect(updated.reviewed).toBe(true);
  });
});
