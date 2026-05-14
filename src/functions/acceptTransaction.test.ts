import { createCategorizationRule, createCategory, createTellerTransaction } from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import type { TellerTransaction } from "~/prisma/client.ts";
import { getPrisma } from "../../test/helpers.ts";
import { acceptTransaction } from "./acceptTransaction.ts";

describe("acceptTransaction", () => {
  const prisma = getPrisma();

  let teller: TellerTransaction;
  beforeEach(async () => {
    teller = await createTellerTransaction({
      amount: -1000,
      vendor: "AMZN MKTP",
      date: "2025-01-15",
    });
  });

  it("creates an empty transaction and marks reviewed when no rule or override exists", async () => {
    const transaction = await acceptTransaction({ data: { id: teller.id } });

    expect(transaction).toMatchObject({
      amount: -1000,
      date: "2025-01-15",
      vendor: "Amzn Mktp",
      tellerId: teller.id,
    });
    expect(
      await prisma.transactionCategory.findMany({ where: { transactionId: transaction.id } }),
    ).toEqual([]);

    const updated = await prisma.tellerTransaction.findUniqueOrThrow({ where: { id: teller.id } });
    expect(updated.reviewed).toBe(true);
  });

  it("uses an existing rule for vendor and category", async () => {
    const cat = await createCategory();
    await createCategorizationRule({
      tellerVendor: teller.vendor,
      vendor: "Amazon",
      category: { connect: { id: cat.id } },
    });

    const transaction = await acceptTransaction({ data: { id: teller.id } });

    expect(transaction.vendor).toBe("Amazon");
    expect(
      await prisma.transactionCategory.findMany({ where: { transactionId: transaction.id } }),
    ).toMatchObject([{ categoryId: cat.id, amount: -1000 }]);
  });

  it("applies an override with split categories", async () => {
    const [category1, category2] = await Promise.all([createCategory(), createCategory()]);

    const transaction = await acceptTransaction({
      data: {
        id: teller.id,
        override: {
          vendor: "Amazon",
          categories: [
            { categoryId: category1.id, amount: -700 },
            { categoryId: category2.id, amount: -300 },
          ],
          updateRuleVendor: false,
          updateRuleCategory: false,
        },
      },
    });

    expect(transaction.vendor).toBe("Amazon");
    const categories = await prisma.transactionCategory.findMany({
      where: { transactionId: transaction.id },
      orderBy: { amount: "asc" },
    });
    expect(
      categories.map((category) => ({ categoryId: category.categoryId, amount: category.amount })),
    ).toEqual([
      { categoryId: category1.id, amount: -700 },
      { categoryId: category2.id, amount: -300 },
    ]);

    expect(await prisma.categorizationRule.count()).toBe(0);
  });

  it("rejects when override category amounts don't sum to the transaction amount", async () => {
    const category = await createCategory();

    await expect(() =>
      acceptTransaction({
        data: {
          id: teller.id,
          override: {
            vendor: "Amazon",
            categories: [{ categoryId: category.id, amount: -500 }],
            updateRuleVendor: false,
            updateRuleCategory: false,
          },
        },
      }),
    ).rejects.toThrow(/sum to transaction amount/);
  });

  it("creates a new rule when updateRuleVendor and updateRuleCategory are set", async () => {
    const category = await createCategory();

    await acceptTransaction({
      data: {
        id: teller.id,
        override: {
          vendor: "Amazon",
          categories: [{ categoryId: category.id, amount: -1000 }],
          updateRuleVendor: true,
          updateRuleCategory: true,
        },
      },
    });

    const rule = await prisma.categorizationRule.findUniqueOrThrow({
      where: { tellerVendor: teller.vendor },
    });
    expect(rule).toMatchObject({ vendor: "Amazon", categoryId: category.id });
  });

  it("updates only the rule fields requested when both flags differ", async () => {
    const [oldCategory, newCategory] = await Promise.all([createCategory(), createCategory()]);
    await createCategorizationRule({
      tellerVendor: teller.vendor,
      vendor: "OldVendor",
      category: { connect: { id: oldCategory.id } },
    });

    await acceptTransaction({
      data: {
        id: teller.id,
        override: {
          vendor: "NewVendor",
          categories: [{ categoryId: newCategory.id, amount: -1000 }],
          updateRuleVendor: true,
          updateRuleCategory: false,
        },
      },
    });

    const rule = await prisma.categorizationRule.findUniqueOrThrow({
      where: { tellerVendor: teller.vendor },
    });
    expect(rule).toMatchObject({ vendor: "NewVendor", categoryId: oldCategory.id });
  });

  it("rejects updating rule category when override has multiple categories", async () => {
    const [category1, category2] = await Promise.all([createCategory(), createCategory()]);

    await expect(() =>
      acceptTransaction({
        data: {
          id: teller.id,
          override: {
            vendor: "Amazon",
            categories: [
              { categoryId: category1.id, amount: -700 },
              { categoryId: category2.id, amount: -300 },
            ],
            updateRuleVendor: false,
            updateRuleCategory: true,
          },
        },
      }),
    ).rejects.toThrow("Can only update rule when exactly one category is selected");
  });
});
