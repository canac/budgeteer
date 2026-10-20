import { parseISO } from "date-fns";
import {
  createBudget,
  createBudgetCategory,
  createCategory,
  createTransaction,
} from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import type { Budget, Category } from "~/prisma/client.ts";
import { calculateCategoryBalance } from "~/lib/calculateBalance.ts";
import { pluck } from "~/lib/collections.ts";
import { getPrisma } from "../../test/helpers.ts";
import { transferLeftovers } from "./transferLeftovers.ts";

describe("transferLeftovers", () => {
  const prisma = getPrisma();
  const month = "2025-03";

  let budget: Budget;
  let fund: Category;
  beforeEach(async () => {
    [budget, fund] = await Promise.all([
      createBudget({ month }),
      createCategory({ accumulating: true, createdMonth: month }),
    ]);
  });

  const createLeftover = async (budgetedAmount: number, spent: number) => {
    const category = await createCategory({ accumulating: false, createdMonth: month });
    await Promise.all([
      createBudgetCategory({
        budgetedAmount,
        category: { connect: { id: category.id } },
        budget: { connect: { id: budget.id } },
      }),
      createTransaction({
        date: "2025-03-10",
        transactionCategories: { create: { amount: -spent, categoryId: category.id } },
      }),
    ]);
    return category;
  };

  const balance = (category: Category) =>
    calculateCategoryBalance({ month: parseISO(month), category });

  it("moves a positive total from leftovers into the destination", async () => {
    const [under, over] = await Promise.all([
      createLeftover(5000, 2000),
      createLeftover(3000, 4000),
    ]);

    const { id } = await transferLeftovers({
      data: { month, destinationCategoryId: fund.id },
    });

    expect(await balance(under)).toBe(0);
    expect(await balance(over)).toBe(0);
    expect(await balance(fund)).toBe(2000);
    const transaction = await prisma.transaction.findUniqueOrThrow({
      where: { id },
      include: { transfer: true },
    });
    expect(transaction).toMatchObject({ type: "TRANSFER", amount: 0, date: "2025-03-31" });
    expect(transaction.transfer).toMatchObject({
      amount: 2000,
      sourceCategoryId: null,
      destinationCategoryId: fund.id,
    });
  });

  it("updates the existing transfer into the same destination", async () => {
    const [first, second] = await Promise.all([
      createLeftover(5000, 1000),
      createLeftover(2000, 2000),
    ]);
    const { id } = await transferLeftovers({ data: { month, destinationCategoryId: fund.id } });
    const initial = await prisma.transactionCategory.findMany({ where: { transactionId: id } });
    expect(pluck(initial, "categoryId").toSorted()).toEqual([first.id, fund.id].toSorted());
    await Promise.all([
      createTransaction({
        date: "2025-03-20",
        transactionCategories: { create: { amount: -1500, categoryId: first.id } },
      }),
      createTransaction({
        date: "2025-03-20",
        transactionCategories: { create: { amount: -500, categoryId: second.id } },
      }),
    ]);

    const updated = await transferLeftovers({ data: { month, destinationCategoryId: fund.id } });

    expect(updated.id).toBe(id);
    expect(await prisma.transaction.count({ where: { type: "TRANSFER" } })).toBe(1);
    expect(await balance(first)).toBe(0);
    expect(await balance(second)).toBe(0);
    expect(await balance(fund)).toBe(2000);
    const transfer = await prisma.transfer.findUniqueOrThrow({ where: { transactionId: id } });
    expect(transfer).toMatchObject({ amount: 2000, destinationCategoryId: fund.id });
    const categories = await prisma.transactionCategory.findMany({ where: { transactionId: id } });
    expect(categories).toHaveLength(3);
  });
  it("creates a separate transfer into a different destination", async () => {
    const [leftover, otherFund] = await Promise.all([
      createLeftover(5000, 1000),
      createCategory({ accumulating: true, createdMonth: month }),
    ]);
    const { id } = await transferLeftovers({ data: { month, destinationCategoryId: fund.id } });
    await createTransaction({
      date: "2025-03-20",
      transactionCategories: { create: { amount: -1500, categoryId: leftover.id } },
    });

    const created = await transferLeftovers({
      data: { month, destinationCategoryId: otherFund.id },
    });

    expect(created.id).not.toBe(id);
    expect(await prisma.transaction.count({ where: { type: "TRANSFER" } })).toBe(2);
    expect(await balance(leftover)).toBe(0);
    expect(await balance(fund)).toBe(4000);
    expect(await balance(otherFund)).toBe(-1500);
  });

  it("rejects a leftover destination", async () => {
    const [, destination] = await Promise.all([
      createLeftover(5000, 1000),
      createLeftover(1000, 0),
    ]);

    await expect(() =>
      transferLeftovers({ data: { month, destinationCategoryId: destination.id } }),
    ).rejects.toThrow("Destination must be an accumulating category");
  });

  it("leaves the destination out when leftovers cancel out", async () => {
    const [under, over] = await Promise.all([
      createLeftover(3000, 2000),
      createLeftover(1000, 2000),
    ]);

    const { id } = await transferLeftovers({ data: { month, destinationCategoryId: fund.id } });

    expect(await balance(under)).toBe(0);
    expect(await balance(over)).toBe(0);
    const categories = await prisma.transactionCategory.findMany({ where: { transactionId: id } });
    expect(pluck(categories, "categoryId").toSorted()).toEqual([under.id, over.id].toSorted());
  });

  it.each([
    { createdMonth: "2025-04", deletedMonth: null },
    { createdMonth: month, deletedMonth: month },
  ])("rejects a destination that is inactive during the month", async (months) => {
    const [, destination] = await Promise.all([
      createLeftover(5000, 1000),
      createCategory({ accumulating: true, ...months }),
    ]);

    await expect(() =>
      transferLeftovers({ data: { month, destinationCategoryId: destination.id } }),
    ).rejects.toThrow("Destination must exist during the month");
  });

  it("rejects when there is nothing to transfer", async () => {
    await createLeftover(2000, 2000);

    await expect(() =>
      transferLeftovers({ data: { month, destinationCategoryId: fund.id } }),
    ).rejects.toThrow("Nothing to transfer");
  });
});
