import { prisma } from "./src/lib/prisma.ts";

// Delete all existing data
await prisma.transaction.deleteMany();
await prisma.category.deleteMany();
await prisma.fund.deleteMany();
await prisma.budget.deleteMany();

// Create a budget for August 2025
const augustBudget = await prisma.budget.create({
  data: {
    name: "Household",
    month: "08-2025",
    income: 5000,
    categories: {
      create: [
        { name: "Groceries", amount: 600 },
        { name: "Utilities", amount: 300 },
        { name: "Entertainment", amount: 200 },
      ],
    },
    funds: {
      create: [
        { name: "Emergency Fund", initialBalance: 2000 },
        { name: "Vacation Fund", initialBalance: 1000 },
      ],
    },
  },
  include: { categories: true, funds: true },
});

// Add transactions to categories
await prisma.transaction.create({
  data: {
    amount: -150,
    date: "2025-08-05T00:00:00.000Z",
    vendor: "Supermarket",
    description: "Weekly groceries",
    categoryId: augustBudget.categories[0].id,
  },
});
await prisma.transaction.create({
  data: {
    amount: -80,
    date: "2025-08-10T00:00:00.000Z",
    vendor: "Electric Company",
    description: "Monthly bill",
    categoryId: augustBudget.categories[1].id,
  },
});

// Add transactions to funds
await prisma.transaction.create({
  data: {
    amount: -200,
    date: "2025-08-15T00:00:00.000Z",
    vendor: "Car Repair",
    description: "Unexpected repair",
    fundId: augustBudget.funds[0].id,
  },
});
await prisma.transaction.create({
  data: {
    amount: -500,
    date: "2025-08-20T00:00:00.000Z",
    vendor: "Travel Agency",
    description: "Vacation deposit",
    fundId: augustBudget.funds[1].id,
  },
});
