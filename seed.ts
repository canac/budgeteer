import { prisma } from "./src/lib/prisma.ts";

// Delete all existing data
await prisma.transaction.deleteMany();
await prisma.category.deleteMany();
await prisma.budget.deleteMany();

const emergencyFund = await prisma.category.create({
  data: {
    name: "Emergency Fund",
    fund: true,
  },
});

const vacationFund = await prisma.category.create({
  data: {
    name: "Vacation Fund",
    fund: true,
  },
});

const groceriesCategory = await prisma.category.create({
  data: {
    name: "Groceries",
  },
});

const utilitiesCategory = await prisma.category.create({
  data: {
    name: "Utilities",
  },
});

const entertainmentCategory = await prisma.category.create({
  data: {
    name: "Entertainment",
  },
});

await prisma.budget.create({
  data: {
    month: "07-2025",
    income: 5000,
    budgetCategories: {
      create: [
        { categoryId: emergencyFund.id, budgetedAmount: 800 },
        { categoryId: vacationFund.id, budgetedAmount: 500 },
        { categoryId: groceriesCategory.id, budgetedAmount: 600 },
        { categoryId: utilitiesCategory.id, budgetedAmount: 300 },
        { categoryId: entertainmentCategory.id, budgetedAmount: 200 },
      ],
    },
  },
});

await prisma.budget.create({
  data: {
    month: "08-2025",
    income: 5000,
    budgetCategories: {
      create: [
        { categoryId: emergencyFund.id, budgetedAmount: 1000 },
        { categoryId: vacationFund.id, budgetedAmount: 250 },
        { categoryId: groceriesCategory.id, budgetedAmount: 600 },
        { categoryId: utilitiesCategory.id, budgetedAmount: 300 },
        { categoryId: entertainmentCategory.id, budgetedAmount: 200 },
      ],
    },
  },
});

// Add transactions to categories
await prisma.transaction.create({
  data: {
    amount: -150,
    date: "2025-07-05T00:00:00.000Z",
    vendor: "Supermarket",
    description: "Weekly groceries",
    categoryId: groceriesCategory.id,
  },
});
await prisma.transaction.create({
  data: {
    amount: -150,
    date: "2025-08-05T00:00:00.000Z",
    vendor: "Supermarket",
    description: "Weekly groceries",
    categoryId: groceriesCategory.id,
  },
});
await prisma.transaction.create({
  data: {
    amount: -80,
    date: "2025-08-10T00:00:00.000Z",
    vendor: "Electric Company",
    description: "Monthly bill",
    categoryId: utilitiesCategory.id,
  },
});

// Add transactions to categories
await prisma.transaction.create({
  data: {
    amount: -200,
    date: "2025-07-15T00:00:00.000Z",
    vendor: "Car Repair",
    description: "Unexpected repair",
    categoryId: emergencyFund.id,
  },
});
await prisma.transaction.create({
  data: {
    amount: -500,
    date: "2025-08-20T00:00:00.000Z",
    vendor: "Travel Agency",
    description: "Vacation deposit",
    categoryId: vacationFund.id,
  },
});
