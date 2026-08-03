import { createCategory } from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { createTransfer } from "./createTransfer.ts";

describe("createTransfer", () => {
  const prisma = getPrisma();

  let sourceCategoryId: string;
  let destinationCategoryId: string;
  beforeEach(async () => {
    const [source, destination] = await Promise.all([createCategory(), createCategory()]);
    sourceCategoryId = source.id;
    destinationCategoryId = destination.id;
  });

  const transferData = () => ({
    amount: 5000,
    date: "2025-01-31",
    sourceCategoryId,
    destinationCategoryId,
  });

  it("stores the description", async () => {
    const { id } = await createTransfer({
      data: { ...transferData(), description: "Cover overspending" },
    });

    const transaction = await prisma.transaction.findUniqueOrThrow({ where: { id } });
    expect(transaction.description).toBe("Cover overspending");
  });

  it("leaves the description null when omitted", async () => {
    const { id } = await createTransfer({ data: transferData() });

    const transaction = await prisma.transaction.findUniqueOrThrow({ where: { id } });
    expect(transaction.description).toBeNull();
  });
});
