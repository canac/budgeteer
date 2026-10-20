import { parseISO } from "date-fns";
import type { ExternalAccount, ExternalConnection } from "~/prisma/client";
import { getPrisma } from "~/lib/prisma";
import type { PlaidSyncPage, PlaidTransaction } from "./types";
import { find, pluck } from "../collections";
import { dollarsToPennies } from "../currencyConversion";
import { toISODateString } from "../iso";
import { PlaidClient, PlaidError } from "./client";

interface SyncCount {
  imported: number;
}

type ConnectionWithAccounts = ExternalConnection & { accounts: ExternalAccount[] };

/**
 * Find the start date of the oldest budget.
 **/
async function getOldestBudgetDate(): Promise<Date> {
  const oldestBudget = await getPrisma().budget.findFirstOrThrow({
    select: { month: true },
    orderBy: { month: "asc" },
  });
  return parseISO(oldestBudget.month);
}

/**
 * Plaid amounts are negative for spending, so invert the sign.
 **/
function extractAmount(tx: PlaidTransaction): number {
  return -dollarsToPennies(tx.amount);
}

function extractVendor(tx: PlaidTransaction): string {
  return tx.merchant_name ?? tx.name;
}

/**
 * Prefer the purchase date over posted date when available.
 **/
function extractDate(tx: PlaidTransaction): string {
  return tx.authorized_date ?? tx.date;
}

/**
 * Upsert the connection's remote accounts, returning the full account list.
 **/
export async function refreshAccounts(
  client: PlaidClient,
  connection: ConnectionWithAccounts,
): Promise<ExternalAccount[]> {
  const remote = await client.getAccounts(connection.accessToken);
  const created = await getPrisma().externalAccount.createManyAndReturn({
    data: remote.map((account) => ({
      id: account.account_id,
      name: account.name,
      institution: connection.institution,
      creditCard: account.type === "credit",
      connectionId: connection.id,
    })),
    skipDuplicates: true,
  });
  return [...connection.accounts, ...created];
}

async function applyAdded(
  added: PlaidTransaction[],
  enabledAccountIds: Set<string>,
  oldestIso: string,
): Promise<number> {
  const prisma = getPrisma();
  const toInsert = added.filter(
    (tx) => !tx.pending && enabledAccountIds.has(tx.account_id) && extractDate(tx) >= oldestIso,
  );
  const { count } = await prisma.externalTransaction.createMany({
    data: toInsert.map((tx) => ({
      id: tx.transaction_id,
      amount: extractAmount(tx),
      date: extractDate(tx),
      vendor: extractVendor(tx),
      accountId: tx.account_id,
    })),
    skipDuplicates: true,
  });
  // Clear un-removed transactions
  await prisma.externalTransaction.updateMany({
    where: {
      id: { in: pluck(toInsert, "transaction_id") },
      removedAt: { not: null },
    },
    data: { removedAt: null },
  });
  return count;
}

async function applyModified(modified: PlaidTransaction[]): Promise<void> {
  const prisma = getPrisma();
  const existingTransactions = await prisma.externalTransaction.findMany({
    where: { id: { in: pluck(modified, "transaction_id") } },
    include: { transaction: true },
  });

  await Promise.all(
    modified.map(async (tx) => {
      const existing = find(existingTransactions, "id", tx.transaction_id);
      if (!existing) {
        return;
      }

      const amount = extractAmount(tx);
      const date = extractDate(tx);
      // Flag accepted transactions as modified when the amount changes
      const modified = existing.transaction !== null && amount !== existing.amount;
      const moved = existing.transaction !== null && date !== existing.date;
      await prisma.externalTransaction.update({
        where: { id: tx.transaction_id },
        data: {
          amount,
          date,
          vendor: extractVendor(tx),
          ...(modified ? { changedAt: new Date() } : {}),
          ...(moved ? { transaction: { update: { date } } } : {}),
        },
      });
    }),
  );
}

async function applyRemoved(removed: { transaction_id: string }[]): Promise<void> {
  const prisma = getPrisma();
  const existingTransactions = await prisma.externalTransaction.findMany({
    where: { id: { in: pluck(removed, "transaction_id") }, removedAt: null },
    include: { transaction: true },
  });

  await Promise.all(
    existingTransactions.map((existing) =>
      prisma.externalTransaction.update({
        where: { id: existing.id },
        data: {
          removedAt: new Date(),
          // Flag accepted transactions as changed so the removal surfaces for review
          ...(existing.transaction ? { changedAt: new Date() } : {}),
        },
      }),
    ),
  );
}

export async function syncConnection(connection: ConnectionWithAccounts): Promise<SyncCount> {
  const prisma = getPrisma();
  const client = new PlaidClient();

  try {
    const accounts = await refreshAccounts(client, connection);
    const enabledAccountIds = new Set(
      accounts.filter((account) => account.enabled).map((account) => account.id),
    );
    const oldestIso = toISODateString(await getOldestBudgetDate());

    let cursor = connection.cursor;
    let imported = 0;
    let hasMore = true;
    /* oxlint-disable no-await-in-loop */
    while (hasMore) {
      const page: PlaidSyncPage = await client.syncTransactions(connection.accessToken, cursor);

      imported += await applyAdded(page.added, enabledAccountIds, oldestIso);
      await applyModified(page.modified);
      await applyRemoved(page.removed);

      cursor = page.next_cursor;
      hasMore = page.has_more;
      await prisma.externalConnection.update({
        where: { id: connection.id },
        data: { cursor },
      });
    }
    /* oxlint-enable no-await-in-loop */

    // A successful sync clears any previous reauthenticate flag
    await prisma.externalConnection.update({
      where: { id: connection.id },
      data: { loginRequired: false },
    });

    return { imported };
  } catch (error) {
    // The item's credentials expired (OAuth reauthenticate needed). Flag it so the UI
    // can prompt a reconnect.
    if (error instanceof PlaidError && error.errorCode === "ITEM_LOGIN_REQUIRED") {
      await prisma.externalConnection.update({
        where: { id: connection.id },
        data: { loginRequired: true },
      });
      return { imported: 0 };
    }
    throw error;
  }
}
