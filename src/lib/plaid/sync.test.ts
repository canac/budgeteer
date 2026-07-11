import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import type { PlaidAccount, PlaidTransaction } from "./types.ts";
import { getPrisma } from "../../../test/helpers.ts";
import {
  createBudget,
  createExternalAccount,
  createExternalConnection,
  createExternalTransaction,
  transaction,
} from "../../../test/mocks.ts";
import { server } from "../../../test/mswServer.ts";
import { pluck } from "../collections.ts";
import { syncConnection } from "./sync.ts";

const PLAID_ORIGIN = "https://sandbox.plaid.com";

interface SyncPage {
  added?: PlaidTransaction[];
  modified?: PlaidTransaction[];
  removed?: { transaction_id: string }[];
  next_cursor?: string;
  has_more?: boolean;
}

function apiAccount(fields?: Partial<PlaidAccount>): PlaidAccount {
  return { account_id: "acc_1", name: "Checking", type: "depository", ...fields };
}

function apiTx(fields?: Partial<PlaidTransaction>): PlaidTransaction {
  return {
    transaction_id: "t1",
    account_id: "acc_1",
    amount: 12.34,
    date: "2026-04-15",
    name: "WHOLEFOODS MKT",
    merchant_name: "Whole Foods",
    pending: false,
    ...fields,
  };
}

function mockAccounts(accounts: PlaidAccount[]) {
  server.use(
    http.post(`${PLAID_ORIGIN}/accounts/get`, () =>
      HttpResponse.json({ accounts, item: {}, request_id: "r" }),
    ),
  );
}

interface SyncRequestBody {
  access_token: string;
  cursor?: string;
}

/** Registers a /transactions/sync handler that returns each page in sequence. */
function mockSync(pages: SyncPage[], onRequest?: (body: SyncRequestBody) => void) {
  let index = 0;
  server.use(
    http.post<never, SyncRequestBody>(`${PLAID_ORIGIN}/transactions/sync`, async ({ request }) => {
      onRequest?.(await request.json());
      const page = pages[Math.min(index, pages.length - 1)];
      index++;
      return HttpResponse.json({
        added: [],
        modified: [],
        removed: [],
        next_cursor: "cursor-final",
        has_more: false,
        request_id: "r",
        ...page,
      });
    }),
  );
}

const prisma = getPrisma();

async function seed(options?: { accountFields?: Parameters<typeof createExternalAccount>[0] }) {
  await createBudget({ month: "2026-04" });
  const connection = await createExternalConnection({ institution: "Capital One" });
  await createExternalAccount({
    id: "acc_1",
    connection: { connect: { id: connection.id } },
    ...options?.accountFields,
  });
  return prisma.externalConnection.findUniqueOrThrow({
    where: { id: connection.id },
    include: { accounts: true },
  });
}

describe("syncConnection", () => {
  it("imports posted transactions and returns the count", async () => {
    const connection = await seed();
    mockAccounts([apiAccount()]);
    mockSync([
      {
        added: [
          apiTx({ transaction_id: "t1", amount: 12.34, date: "2026-04-15" }),
          apiTx({ transaction_id: "t2", amount: 5, date: "2026-04-16" }),
        ],
      },
    ]);

    const result = await syncConnection(connection);

    expect(result).toEqual({ imported: 2 });
    const stored = await prisma.externalTransaction.findMany({ orderBy: { id: "asc" } });
    expect(stored.map((tx) => [tx.id, tx.amount, tx.date, tx.vendor])).toEqual([
      ["t1", -1234, "2026-04-15", "Whole Foods"],
      ["t2", -500, "2026-04-16", "Whole Foods"],
    ]);
  });

  it("filters out pending transactions", async () => {
    const connection = await seed();
    mockAccounts([apiAccount()]);
    mockSync([
      {
        added: [
          apiTx({ transaction_id: "t_posted", pending: false }),
          apiTx({ transaction_id: "t_pending", pending: true }),
        ],
      },
    ]);

    const result = await syncConnection(connection);

    expect(result.imported).toBe(1);
    expect(pluck(await prisma.externalTransaction.findMany(), "id")).toEqual(["t_posted"]);
  });

  it("filters out transactions dated before the oldest budget", async () => {
    const connection = await seed();
    mockAccounts([apiAccount()]);
    mockSync([
      {
        added: [
          apiTx({ transaction_id: "t_old", date: "2026-03-25" }),
          apiTx({ transaction_id: "t_edge", date: "2026-04-01" }),
          apiTx({ transaction_id: "t_new", date: "2026-04-10" }),
        ],
      },
    ]);

    const result = await syncConnection(connection);

    expect(result.imported).toBe(2);
    expect(
      pluck(await prisma.externalTransaction.findMany({ orderBy: { id: "asc" } }), "id"),
    ).toEqual(["t_edge", "t_new"]);
  });

  it("uses merchant_name, falling back to name", async () => {
    const connection = await seed();
    mockAccounts([apiAccount()]);
    mockSync([
      {
        added: [
          apiTx({ transaction_id: "t_m", merchant_name: "Amazon", name: "AMZN MKTP" }),
          apiTx({ transaction_id: "t_n", merchant_name: null, name: "PAYPAL *MERCHANT" }),
        ],
      },
    ]);

    await syncConnection(connection);

    const stored = await prisma.externalTransaction.findMany({ orderBy: { id: "asc" } });
    expect(stored.map((tx) => [tx.id, tx.vendor])).toEqual([
      ["t_m", "Amazon"],
      ["t_n", "PAYPAL *MERCHANT"],
    ]);
  });

  it("negates Plaid amounts uniformly (spend negative, inflow positive) for all account types", async () => {
    await createBudget({ month: "2026-04" });
    const connection = await createExternalConnection({ institution: "Capital One" });
    await createExternalAccount({
      id: "acc_dep",
      creditCard: false,
      connection: { connect: { id: connection.id } },
    });
    await createExternalAccount({
      id: "acc_cc",
      creditCard: true,
      connection: { connect: { id: connection.id } },
    });
    const withAccounts = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: connection.id },
      include: { accounts: true },
    });

    mockAccounts([
      apiAccount({ account_id: "acc_dep", type: "depository" }),
      apiAccount({ account_id: "acc_cc", type: "credit" }),
    ]);
    mockSync([
      {
        added: [
          apiTx({ transaction_id: "dep_spend", account_id: "acc_dep", amount: 50 }),
          apiTx({ transaction_id: "dep_income", account_id: "acc_dep", amount: -200 }),
          apiTx({ transaction_id: "cc_charge", account_id: "acc_cc", amount: 50 }),
          apiTx({ transaction_id: "cc_payment", account_id: "acc_cc", amount: -50 }),
        ],
      },
    ]);

    await syncConnection(withAccounts);

    const stored = await prisma.externalTransaction.findMany({ orderBy: { id: "asc" } });
    expect(stored.map((tx) => [tx.id, tx.amount])).toEqual([
      ["cc_charge", -5000],
      ["cc_payment", 5000],
      ["dep_income", 20000],
      ["dep_spend", -5000],
    ]);
  });

  it("sends the stored cursor on the first request", async () => {
    const connection = await seed();
    await prisma.externalConnection.update({
      where: { id: connection.id },
      data: { cursor: "cursor-stored" },
    });
    const reloaded = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: connection.id },
      include: { accounts: true },
    });
    let firstBody: SyncRequestBody | undefined;
    mockAccounts([apiAccount()]);
    mockSync([{ added: [] }], (body) => {
      firstBody ??= body;
    });

    await syncConnection(reloaded);

    expect(firstBody).toMatchObject({ cursor: "cursor-stored" });
  });

  it("paginates until has_more is false, forwarding the cursor", async () => {
    const connection = await seed();
    const cursors: (string | undefined)[] = [];
    mockAccounts([apiAccount()]);
    mockSync(
      [
        { added: [apiTx({ transaction_id: "p1" })], next_cursor: "cursor-2", has_more: true },
        { added: [apiTx({ transaction_id: "p2" })], next_cursor: "cursor-3", has_more: false },
      ],
      (body) => cursors.push(body.cursor),
    );

    const result = await syncConnection(connection);

    expect(result.imported).toBe(2);
    expect(cursors).toEqual([undefined, "cursor-2"]);
    const stored = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: connection.id },
    });
    expect(stored.cursor).toBe("cursor-3");
  });

  it("skips duplicate added transactions", async () => {
    const connection = await seed();
    await createExternalTransaction({
      id: "t_existing",
      account: { connect: { id: "acc_1" } },
      amount: -100,
      vendor: "OLD",
      date: "2026-04-15",
    });
    mockAccounts([apiAccount()]);
    mockSync([
      {
        added: [
          apiTx({ transaction_id: "t_existing", amount: 99.99 }),
          apiTx({ transaction_id: "t_new", date: "2026-04-16" }),
        ],
      },
    ]);

    const result = await syncConnection(connection);

    expect(result.imported).toBe(1);
    const existing = await prisma.externalTransaction.findUniqueOrThrow({
      where: { id: "t_existing" },
    });
    expect([existing.amount, existing.vendor]).toEqual([-100, "OLD"]);
  });

  it("imports only transactions for enabled accounts", async () => {
    await createBudget({ month: "2026-04" });
    const connection = await createExternalConnection({ institution: "Capital One" });
    await createExternalAccount({
      id: "acc_on",
      enabled: true,
      connection: { connect: { id: connection.id } },
    });
    await createExternalAccount({
      id: "acc_off",
      enabled: false,
      connection: { connect: { id: connection.id } },
    });
    const withAccounts = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: connection.id },
      include: { accounts: true },
    });

    mockAccounts([apiAccount({ account_id: "acc_on" }), apiAccount({ account_id: "acc_off" })]);
    mockSync([
      {
        added: [
          apiTx({ transaction_id: "on", account_id: "acc_on" }),
          apiTx({ transaction_id: "off", account_id: "acc_off" }),
        ],
      },
    ]);

    const result = await syncConnection(withAccounts);

    expect(result.imported).toBe(1);
    expect(pluck(await prisma.externalTransaction.findMany(), "id")).toEqual(["on"]);
  });

  it("creates newly appeared accounts before importing their transactions", async () => {
    await createBudget({ month: "2026-04" });
    const connection = await createExternalConnection({ institution: "Citi" });
    const withAccounts = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: connection.id },
      include: { accounts: true },
    });

    mockAccounts([apiAccount({ account_id: "acc_fresh", name: "Savings", type: "credit" })]);
    mockSync([{ added: [apiTx({ transaction_id: "t1", account_id: "acc_fresh" })] }]);

    const result = await syncConnection(withAccounts);

    expect(result.imported).toBe(1);
    const account = await prisma.externalAccount.findUniqueOrThrow({ where: { id: "acc_fresh" } });
    expect([account.institution, account.creditCard]).toEqual(["Citi", true]);
  });

  it("updates lastSyncedAt", async () => {
    const connection = await seed();
    mockAccounts([apiAccount()]);
    mockSync([{ added: [] }]);

    const before = Date.now();
    await syncConnection(connection);
    const after = Date.now();

    const reloaded = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: connection.id },
    });
    const ts = reloaded.lastSyncedAt?.getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe("syncConnection — modified", () => {
  it("updates an unreviewed snapshot in place without flagging", async () => {
    const connection = await seed();
    await createExternalTransaction({
      id: "t1",
      account: { connect: { id: "acc_1" } },
      amount: -1000,
      vendor: "OLD",
      date: "2026-04-10",
    });
    mockAccounts([apiAccount()]);
    mockSync([
      {
        modified: [
          apiTx({
            transaction_id: "t1",
            amount: 20,
            merchant_name: "New Vendor",
            date: "2026-04-20",
          }),
        ],
      },
    ]);

    await syncConnection(connection);

    const tx = await prisma.externalTransaction.findUniqueOrThrow({ where: { id: "t1" } });
    expect([tx.amount, tx.vendor, tx.date, tx.changedAt]).toEqual([
      -2000,
      "New Vendor",
      "2026-04-20",
      null,
    ]);
  });

  it("flags an accepted transaction when the amount changes, without touching the Transaction", async () => {
    const connection = await seed();
    await createExternalTransaction({
      id: "t1",
      account: { connect: { id: "acc_1" } },
      amount: -1000,
      reviewed: true,
      transaction: { create: transaction({ amount: -1000, vendor: "Groceries" }) },
    });
    mockAccounts([apiAccount()]);
    mockSync([{ modified: [apiTx({ transaction_id: "t1", amount: 20 })] }]);

    await syncConnection(connection);

    const tx = await prisma.externalTransaction.findUniqueOrThrow({
      where: { id: "t1" },
      include: { transaction: true },
    });
    expect(tx.amount).toBe(-2000);
    expect(tx.changedAt).not.toBeNull();
    expect(tx.transaction?.amount).toBe(-1000);
    expect(tx.transaction?.vendor).toBe("Groceries");
  });

  it("does not flag an accepted transaction when the amount is unchanged", async () => {
    const connection = await seed();
    await createExternalTransaction({
      id: "t1",
      account: { connect: { id: "acc_1" } },
      amount: -1000,
      reviewed: true,
      transaction: { create: transaction({ amount: -1000 }) },
    });
    mockAccounts([apiAccount()]);
    mockSync([
      { modified: [apiTx({ transaction_id: "t1", amount: 10, merchant_name: "Renamed" })] },
    ]);

    await syncConnection(connection);

    const tx = await prisma.externalTransaction.findUniqueOrThrow({ where: { id: "t1" } });
    expect(tx.changedAt).toBeNull();
  });

  it("ignores modifications for transactions it never stored", async () => {
    const connection = await seed();
    mockAccounts([apiAccount()]);
    mockSync([{ modified: [apiTx({ transaction_id: "unknown", amount: 5 })] }]);

    await expect(syncConnection(connection)).resolves.toEqual({ imported: 0 });
    expect(await prisma.externalTransaction.count()).toBe(0);
  });
});

describe("syncConnection — removed", () => {
  it("deletes an unreviewed transaction", async () => {
    const connection = await seed();
    await createExternalTransaction({ id: "t1", account: { connect: { id: "acc_1" } } });
    mockAccounts([apiAccount()]);
    mockSync([{ removed: [{ transaction_id: "t1" }] }]);

    await syncConnection(connection);

    expect(await prisma.externalTransaction.findUnique({ where: { id: "t1" } })).toBeNull();
  });

  it("deletes a rejected transaction", async () => {
    const connection = await seed();
    await createExternalTransaction({
      id: "t1",
      account: { connect: { id: "acc_1" } },
      reviewed: true,
    });
    mockAccounts([apiAccount()]);
    mockSync([{ removed: [{ transaction_id: "t1" }] }]);

    await syncConnection(connection);

    expect(await prisma.externalTransaction.findUnique({ where: { id: "t1" } })).toBeNull();
  });

  it("flags an accepted transaction instead of deleting it", async () => {
    const connection = await seed();
    await createExternalTransaction({
      id: "t1",
      account: { connect: { id: "acc_1" } },
      reviewed: true,
      transaction: { create: transaction() },
    });
    mockAccounts([apiAccount()]);
    mockSync([{ removed: [{ transaction_id: "t1" }] }]);

    await syncConnection(connection);

    const tx = await prisma.externalTransaction.findUnique({
      where: { id: "t1" },
      include: { transaction: true },
    });
    expect(tx).not.toBeNull();
    expect(tx?.changedAt).not.toBeNull();
    expect(tx?.transaction).not.toBeNull();
  });

  it("ignores removals for transactions it never stored", async () => {
    const connection = await seed();
    mockAccounts([apiAccount()]);
    mockSync([{ removed: [{ transaction_id: "ghost" }] }]);

    await expect(syncConnection(connection)).resolves.toEqual({ imported: 0 });
  });
});

describe("syncConnection — reauthenticate", () => {
  function mockPlaidError(errorCode: string) {
    server.use(
      http.post(`${PLAID_ORIGIN}/accounts/get`, () =>
        HttpResponse.json(
          { error_type: "ITEM_ERROR", error_code: errorCode, error_message: "x" },
          { status: 400 },
        ),
      ),
    );
  }

  it("flags the connection for reauthenticate on ITEM_LOGIN_REQUIRED without throwing", async () => {
    const connection = await seed();
    mockPlaidError("ITEM_LOGIN_REQUIRED");

    await expect(syncConnection(connection)).resolves.toEqual({ imported: 0 });

    const reloaded = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: connection.id },
    });
    expect(reloaded.loginRequired).toBe(true);
  });

  it("clears the reauthenticate flag after a successful sync", async () => {
    const connection = await seed();
    await prisma.externalConnection.update({
      where: { id: connection.id },
      data: { loginRequired: true },
    });
    const reloaded = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: connection.id },
      include: { accounts: true },
    });
    mockAccounts([apiAccount()]);
    mockSync([{ added: [] }]);

    await syncConnection(reloaded);

    const after = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: connection.id },
    });
    expect(after.loginRequired).toBe(false);
  });

  it("rethrows non-login Plaid errors and leaves the flag unset", async () => {
    const connection = await seed();
    mockPlaidError("INTERNAL_SERVER_ERROR");

    await expect(syncConnection(connection)).rejects.toThrow("Plaid request failed");

    const reloaded = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: connection.id },
    });
    expect(reloaded.loginRequired).toBe(false);
  });
});
