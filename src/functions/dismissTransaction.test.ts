import { createExternalTransaction } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { dismissTransaction } from "./dismissTransaction.ts";

describe("dismissTransaction", () => {
  const prisma = getPrisma();

  it("marks the transaction as reviewed", async () => {
    const external = await createExternalTransaction();

    await dismissTransaction({ data: { id: external.id } });

    const updated = await prisma.externalTransaction.findUniqueOrThrow({
      where: { id: external.id },
    });
    expect(updated.reviewed).toBe(true);
  });
});
