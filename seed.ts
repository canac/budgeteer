import { prisma } from "./src/lib/prisma.ts";

// Delete all existing data
await prisma.transactionCategory.deleteMany();
await prisma.transaction.deleteMany();
await prisma.category.deleteMany();
await prisma.budget.deleteMany();

const emergencyFund = await prisma.category.create({
  data: {
    name: "Emergency Fund",
    type: "SAVINGS",
  },
});

const vacationFund = await prisma.category.create({
  data: {
    name: "Vacation Fund",
    type: "ACCUMULATING",
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
    month: "2025-07",
    income: 500000,
    budgetCategories: {
      create: [
        { categoryId: emergencyFund.id, budgetedAmount: 80000 },
        { categoryId: vacationFund.id, budgetedAmount: 50000 },
        { categoryId: groceriesCategory.id, budgetedAmount: 60000 },
        { categoryId: utilitiesCategory.id, budgetedAmount: 30000 },
        { categoryId: entertainmentCategory.id, budgetedAmount: 20000 },
      ],
    },
  },
});

await prisma.budget.create({
  data: {
    month: "2025-08",
    income: 500000,
    budgetCategories: {
      create: [
        { categoryId: emergencyFund.id, budgetedAmount: 100000 },
        { categoryId: vacationFund.id, budgetedAmount: 25000 },
        { categoryId: groceriesCategory.id, budgetedAmount: 60000 },
        { categoryId: utilitiesCategory.id, budgetedAmount: 30000 },
        { categoryId: entertainmentCategory.id, budgetedAmount: 20000 },
      ],
    },
  },
});

// Add transactions to categories
await prisma.transaction.create({
  data: {
    amount: -15000,
    date: "2025-07-05",
    vendor: "Supermarket",
    description: "Weekly groceries",
    transactionCategories: {
      create: {
        amount: -15000,
        categoryId: groceriesCategory.id,
      },
    },
  },
});
await prisma.transaction.create({
  data: {
    amount: -15000,
    date: "2025-08-05",
    vendor: "Supermarket",
    description: "Weekly groceries",
    transactionCategories: {
      create: {
        amount: -15000,
        categoryId: groceriesCategory.id,
      },
    },
  },
});
await prisma.transaction.create({
  data: {
    amount: -8000,
    date: "2025-08-10",
    vendor: "Electric Company",
    description: "Monthly bill",
    transactionCategories: {
      create: {
        amount: -8000,
        categoryId: utilitiesCategory.id,
      },
    },
  },
});

// Add transactions to categories
await prisma.transaction.create({
  data: {
    amount: -20000,
    date: "2025-07-15",
    vendor: "Car Repair",
    description: "Unexpected repair",
    transactionCategories: {
      create: {
        amount: -20000,
        categoryId: emergencyFund.id,
      },
    },
  },
});
await prisma.transaction.create({
  data: {
    amount: -50000,
    date: "2025-08-20",
    vendor: "Travel Agency",
    description: "Vacation deposit",
    transactionCategories: {
      create: {
        amount: -50000,
        categoryId: vacationFund.id,
      },
    },
  },
});
await prisma.transaction.create({
  data: {
    amount: -25000,
    date: "2025-08-22",
    vendor: "Costco",
    description: "Bulk shopping trip",
    transactionCategories: {
      create: [
        {
          amount: -12000,
          categoryId: groceriesCategory.id,
        },
        {
          amount: -8000,
          categoryId: entertainmentCategory.id,
        },
        {
          amount: -5000,
          categoryId: utilitiesCategory.id,
        },
      ],
    },
  },
});
