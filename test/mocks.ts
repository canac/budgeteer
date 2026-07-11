import type {
  BudgetCategoryCreateInput,
  BudgetCreateInput,
  CategorizationRuleCreateInput,
  CategoryCreateInput,
  ExternalAccountCreateInput,
  ExternalConnectionCreateInput,
  ExternalTransactionCreateInput,
  TransactionCreateInput,
} from "src/prisma/models";
import { faker } from "@faker-js/faker";
import { getPrisma } from "./helpers";

type WithRequired<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;

const randomMonth = () => faker.date.recent({ days: 365 }).toISOString().slice(0, 7);
const randomDate = () => faker.date.recent({ days: 365 }).toISOString().slice(0, 10);

export const externalConnection = (
  fields?: Partial<ExternalConnectionCreateInput>,
): ExternalConnectionCreateInput => ({
  id: `item_${faker.string.nanoid()}`,
  accessToken: `access-sandbox-${faker.string.alphanumeric(32)}`,
  institution: faker.company.name(),
  ...fields,
});

export const externalAccount = (
  fields?: Partial<ExternalAccountCreateInput>,
): ExternalAccountCreateInput => ({
  id: `acc_${faker.string.nanoid()}`,
  name: faker.finance.accountName(),
  institution: faker.company.name(),
  connection: { create: externalConnection() },
  ...fields,
});

export const externalTransaction = (
  fields?: Partial<ExternalTransactionCreateInput>,
): ExternalTransactionCreateInput => ({
  id: `txn_${faker.string.nanoid()}`,
  amount: -faker.number.int({ min: 100, max: 50000 }),
  date: randomDate(),
  vendor: faker.company.name().toUpperCase(),
  account: { create: externalAccount() },
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
  externalVendor: faker.company.name().toUpperCase(),
  vendor: faker.company.name(),
  ...fields,
});

export const createExternalConnection = (...args: Parameters<typeof externalConnection>) =>
  getPrisma().externalConnection.create({ data: externalConnection(...args) });

export const createExternalAccount = (...args: Parameters<typeof externalAccount>) =>
  getPrisma().externalAccount.create({ data: externalAccount(...args) });

export const createExternalTransaction = (...args: Parameters<typeof externalTransaction>) =>
  getPrisma().externalTransaction.create({ data: externalTransaction(...args) });

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
