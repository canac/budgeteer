import { startOfMonth, subMonths } from "date-fns";
import {
  createBudget,
  createBudgetCategory,
  createCategory,
  createTransaction,
} from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import type { Budget } from "~/prisma/client.ts";
import { find } from "~/lib/collections.ts";
import { toISODateString, toISOMonthString } from "~/lib/iso.ts";
import { getCategoriesWithBalances } from "./getCategoriesWithBalances.ts";

describe("getCategoriesWithBalances", () => {
  const now = new Date();
  const thisMonth = toISOMonthString(now);
  const lastMonth = toISOMonthString(subMonths(now, 1));
  const thisMonthDate = toISODateString(startOfMonth(now));
  const lastMonthDate = toISODateString(startOfMonth(subMonths(now, 1)));

  let thisMonthBudget: Budget;
  let lastMonthBudget: Budget;
  beforeEach(async () => {
    [lastMonthBudget, thisMonthBudget] = await Promise.all([
      createBudget({ month: lastMonth }),
      createBudget({ month: thisMonth }),
    ]);
  });

  it("reports only the current month for non-accumulating categories", async () => {
    const { id } = await createCategory({ accumulating: false, createdMonth: lastMonth });
    await Promise.all([
      createBudgetCategory({
        budgetedAmount: 3000,
        category: { connect: { id } },
        budget: { connect: { id: lastMonthBudget.id } },
      }),
      createBudgetCategory({
        budgetedAmount: 5000,
        category: { connect: { id } },
        budget: { connect: { id: thisMonthBudget.id } },
      }),
      createTransaction({
        date: lastMonthDate,
        transactionCategories: { create: { amount: -2000, categoryId: id } },
      }),
      createTransaction({
        date: thisMonthDate,
        transactionCategories: { create: { amount: -1000, categoryId: id } },
      }),
    ]);

    const categories = await getCategoriesWithBalances();

    // Current month only: budgeted 5000 - spent 1000
    expect(find(categories, "id", id)?.balance).toBe(4000);
  });

  it("accumulates through the current month for fund categories", async () => {
    const { id } = await createCategory({ accumulating: true, createdMonth: lastMonth });
    await Promise.all([
      createBudgetCategory({
        budgetedAmount: 3000,
        category: { connect: { id } },
        budget: { connect: { id: lastMonthBudget.id } },
      }),
      createBudgetCategory({
        budgetedAmount: 5000,
        category: { connect: { id } },
        budget: { connect: { id: thisMonthBudget.id } },
      }),
      createTransaction({
        date: lastMonthDate,
        transactionCategories: { create: { amount: -2000, categoryId: id } },
      }),
      createTransaction({
        date: thisMonthDate,
        transactionCategories: { create: { amount: -1000, categoryId: id } },
      }),
    ]);

    const categories = await getCategoriesWithBalances();

    // Accumulates prior months: budgeted 3000+5000 - spent 2000+1000
    expect(find(categories, "id", id)?.balance).toBe(5000);
  });
});
