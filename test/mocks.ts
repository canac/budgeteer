import type {
  BudgetCategoryCreateInput,
  BudgetCreateInput,
  CategorizationRuleCreateInput,
  CategoryCreateInput,
  TellerAccountCreateInput,
  TellerEnrollmentCreateInput,
  TellerTransactionCreateInput,
  TransactionCreateInput,
} from "src/prisma/models";
import { faker } from "@faker-js/faker";
import { getPrisma } from "./helpers";

type WithRequired<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;

const randomMonth = () => faker.date.recent({ days: 365 }).toISOString().slice(0, 7);
const randomDate = () => faker.date.recent({ days: 365 }).toISOString().slice(0, 10);

export const tellerEnrollment = (
  fields?: Partial<TellerEnrollmentCreateInput>,
): TellerEnrollmentCreateInput => ({
  id: `enr_${faker.string.nanoid()}`,
  accessToken: `tok_${faker.string.alphanumeric(32)}`,
  ...fields,
});

export const tellerAccount = (
  fields?: Partial<TellerAccountCreateInput>,
): TellerAccountCreateInput => ({
  id: `acc_${faker.string.nanoid()}`,
  name: faker.finance.accountName(),
  institution: faker.company.name(),
  enrollment: { create: tellerEnrollment() },
  ...fields,
});

export const tellerTransaction = (
  fields?: Partial<TellerTransactionCreateInput>,
): TellerTransactionCreateInput => ({
  id: `txn_${faker.string.nanoid()}`,
  amount: -faker.number.int({ min: 100, max: 50000 }),
  date: randomDate(),
  vendor: faker.company.name().toUpperCase(),
  account: { create: tellerAccount() },
  ...fields,
});

export const budget = (fields?: Partial<BudgetCreateInput>): BudgetCreateInput => ({
  month: randomMonth(),
  income: faker.number.int({ min: 200000, max: 1000000 }),
  ...fields,
});

export const category = (fields?: Partial<CategoryCreateInput>): CategoryCreateInput => ({
  name: faker.commerce.department(),
  sortOrder: faker.number.int({ min: 1, max: 100 }),
  createdMonth: randomMonth(),
  ...fields,
});

export const budgetCategory = (
  fields: WithRequired<BudgetCategoryCreateInput, "category" | "budget">,
): BudgetCategoryCreateInput => ({
  budgetedAmount: faker.number.int({ min: 0, max: 100000 }),
  ...fields,
});

export const transaction = (fields?: Partial<TransactionCreateInput>): TransactionCreateInput => ({
  amount: -faker.number.int({ min: 100, max: 50000 }),
  date: randomDate(),
  vendor: faker.company.name(),
  ...fields,
});

export const categorizationRule = (
  fields?: Partial<CategorizationRuleCreateInput>,
): CategorizationRuleCreateInput => ({
  tellerVendor: faker.company.name().toUpperCase(),
  vendor: faker.company.name(),
  ...fields,
});

export const createTellerEnrollment = (...args: Parameters<typeof tellerEnrollment>) =>
  getPrisma().tellerEnrollment.create({ data: tellerEnrollment(...args) });

export const createTellerAccount = (...args: Parameters<typeof tellerAccount>) =>
  getPrisma().tellerAccount.create({ data: tellerAccount(...args) });

export const createTellerTransaction = (...args: Parameters<typeof tellerTransaction>) =>
  getPrisma().tellerTransaction.create({ data: tellerTransaction(...args) });

export const createBudget = (...args: Parameters<typeof budget>) =>
  getPrisma().budget.create({ data: budget(...args) });

export const createCategory = (...args: Parameters<typeof category>) =>
  getPrisma().category.create({ data: category(...args) });

export const createTransaction = (...args: Parameters<typeof transaction>) =>
  getPrisma().transaction.create({ data: transaction(...args) });

export const createCategorizationRule = (...args: Parameters<typeof categorizationRule>) =>
  getPrisma().categorizationRule.create({ data: categorizationRule(...args) });

export const createBudgetCategory = (...args: Parameters<typeof budgetCategory>) =>
  getPrisma().budgetCategory.create({ data: budgetCategory(...args) });
