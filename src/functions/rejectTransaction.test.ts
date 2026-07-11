import { createExternalTransaction } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { rejectTransaction } from "./rejectTransaction.ts";

describe("rejectTransaction", () => {
  const prisma = getPrisma();

  it("marks the transaction as reviewed", async () => {
    const external = await createExternalTransaction();

    await rejectTransaction({ data: { id: external.id } });

    const updated = await prisma.externalTransaction.findUniqueOrThrow({
      where: { id: external.id },
    });
    expect(updated.reviewed).toBe(true);
  });
});
