import { createBudget, createCategory } from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import type { Category } from "~/prisma/client.ts";
import { getPrisma } from "../../test/helpers.ts";
import { createTransaction } from "./createTransaction.ts";

describe("createTransaction", () => {
  const prisma = getPrisma();

  let category: Category;
  beforeEach(async () => {
    [, category] = await Promise.all([
      createBudget({ month: "2025-01" }),
      createCategory({ createdMonth: "2025-01" }),
    ]);
  });

  it("creates a transaction with a single category", async () => {
    const tx = await createTransaction({
      data: {
        amount: -1000,
        vendor: "Costco",
        date: "2025-01-15",
        categories: [{ categoryId: category.id, amount: -1000 }],
      },
    });

    expect(tx).toMatchObject({ amount: -1000, vendor: "Costco", date: "2025-01-15" });
    const categories = await prisma.transactionCategory.findMany({
      where: { transactionId: tx.id },
    });
    expect(categories).toMatchObject([{ categoryId: category.id, amount: -1000 }]);
  });

  it("creates a transaction split across multiple categories", async () => {
    const other = await createCategory({ createdMonth: "2025-01" });

    const tx = await createTransaction({
      data: {
        amount: -1000,
        vendor: "Costco",
        date: "2025-01-15",
        categories: [
          { categoryId: category.id, amount: -700 },
          { categoryId: other.id, amount: -300 },
        ],
      },
    });

    const categories = await prisma.transactionCategory.findMany({
      where: { transactionId: tx.id },
      orderBy: { amount: "asc" },
    });
    expect(categories).toMatchObject([
      { categoryId: category.id, amount: -700 },
      { categoryId: other.id, amount: -300 },
    ]);
  });

  it("rejects when transaction date precedes category creation", async () => {
    await createBudget({ month: "2024-12" });

    await expect(() =>
      createTransaction({
        data: {
          amount: -1000,
          vendor: "Costco",
          date: "2024-12-15",
          categories: [{ categoryId: category.id, amount: -1000 }],
        },
      }),
    ).rejects.toThrow(/categories that don't exist/);
  });
});
