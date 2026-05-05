import { parseISO } from "date-fns";
import type { TellerAccount, TellerEnrollment } from "~/prisma/client";
import { prisma } from "~/lib/prisma";
import { dollarsToPennies } from "../currencyConversion";
import { toISODateString } from "../iso";
import { chunks, filter } from "../iterators";
import { TellerClient } from "./client";

const TRANSACTION_BATCH_SIZE = 500;

/**
 * Find the start date of the oldest budget.
 */
async function getOldestBudgetDate(): Promise<Date> {
  const oldestBudget = await prisma.budget.findFirstOrThrow({
    select: {
      month: true,
    },
    orderBy: { month: "asc" },
  });
  return parseISO(oldestBudget.month);
}

interface SyncCount {
  imported: number;
}

export async function syncAccount(
  account: TellerAccount,
  enrollment: TellerEnrollment,
): Promise<SyncCount> {
  const client = new TellerClient(enrollment.accessToken);
  const syncStart = await getOldestBudgetDate();
  const syncStartIso = toISODateString(syncStart);

  const transactions = filter(
    client.listTransactions(account.id, syncStart),
    (tx) => tx.status === "posted" && tx.date >= syncStartIso,
  );

  const sign = account.creditCard ? -1 : 1;

  let imported = 0;
  for await (const batch of chunks(transactions, TRANSACTION_BATCH_SIZE)) {
    const { count } = await prisma.tellerTransaction.createMany({
      data: batch.map((tx) => ({
        id: tx.id,
        amount: sign * dollarsToPennies(parseFloat(tx.amount)),
        date: tx.date,
        vendor: tx.details.counterparty?.name ?? tx.description,
        accountId: account.id,
      })),
      skipDuplicates: true,
    });
    imported += count;
  }

  await prisma.tellerAccount.update({
    where: { id: account.id },
    data: { lastSyncedAt: new Date() },
  });

  return { imported };
}

async function syncAccounts(
  enrollment: TellerEnrollment & { accounts: TellerAccount[] },
): Promise<TellerAccount[]> {
  const client = new TellerClient(enrollment.accessToken);
  const remote = await client.listAccounts();

  const created = await prisma.tellerAccount.createManyAndReturn({
    data: remote.map((account) => ({
      id: account.id,
      name: account.name,
      institution: account.institution.name,
      creditCard: account.type === "credit",
      enrollmentId: enrollment.id,
    })),
    skipDuplicates: true,
  });

  return [...enrollment.accounts, ...created];
}

export async function syncEnrollment(
  enrollment: TellerEnrollment & { accounts: TellerAccount[] },
): Promise<SyncCount> {
  const accounts = (await syncAccounts(enrollment)).filter((account) => account.enabled);

  let imported = 0;
  for (const account of accounts) {
    const result = await syncAccount(account, enrollment);
    imported += result.imported;
  }
  return { imported };
}
