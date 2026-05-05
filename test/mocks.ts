import { faker } from "@faker-js/faker";
import {
  BudgetCreateInput,
  CategorizationRuleCreateInput,
  CategoryCreateInput,
  TellerAccountCreateInput,
  TellerEnrollmentCreateInput,
  TellerTransactionCreateInput,
  TransactionCreateInput,
} from "src/prisma/models";
import { getPrisma } from "./helpers";

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
  createdMonth: randomMonth(),
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

export const createTellerEnrollment = (fields?: Partial<TellerEnrollmentCreateInput>) =>
  getPrisma().tellerEnrollment.create({ data: tellerEnrollment(fields) });

export const createTellerAccount = (fields?: Partial<TellerAccountCreateInput>) =>
  getPrisma().tellerAccount.create({ data: tellerAccount(fields) });

export const createTellerTransaction = (fields?: Partial<TellerTransactionCreateInput>) =>
  getPrisma().tellerTransaction.create({ data: tellerTransaction(fields) });

export const createBudget = (fields?: Partial<BudgetCreateInput>) =>
  getPrisma().budget.create({ data: budget(fields) });

export const createCategory = (fields?: Partial<CategoryCreateInput>) =>
  getPrisma().category.create({ data: category(fields) });

export const createTransaction = (fields?: Partial<TransactionCreateInput>) =>
  getPrisma().transaction.create({ data: transaction(fields) });

export const createCategorizationRule = (fields?: Partial<CategorizationRuleCreateInput>) =>
  getPrisma().categorizationRule.create({ data: categorizationRule(fields) });
