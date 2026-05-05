import {
  createBudget,
  createTellerAccount,
  createTellerEnrollment,
  createTellerTransaction,
} from "test/mocks.ts";
import { MockAgent, type Interceptable } from "undici";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TellerApiAccount, TellerApiTransaction } from "./types.ts";
import { getPrisma } from "../../../test/helpers.ts";
import { pluck, range } from "../collections.ts";
import { setDispatcher } from "./client.ts";
import { syncAccount, syncEnrollment } from "./sync.ts";

const TELLER_ORIGIN = "https://api.teller.io";

let agent: MockAgent;
let pool: Interceptable;

function apiAccount(fields?: Partial<TellerApiAccount>): TellerApiAccount {
  return {
    id: "acc_remote",
    name: "Checking",
    institution: { name: "Chase" },
    ...fields,
  };
}

function apiTransaction(fields?: Partial<TellerApiTransaction>): TellerApiTransaction {
  return {
    id: "txn_1",
    amount: "-12.34",
    date: "2026-04-15",
    status: "posted",
    description: "FALLBACK DESC",
    details: { counterparty: { name: "WHOLE FOODS" } },
    ...fields,
  };
}

function interceptAccounts(body: TellerApiAccount[]) {
  pool.intercept({ path: "/accounts", method: "GET" }).reply(200, body);
}

function interceptTransactions(
  accountId: string,
  body: TellerApiTransaction[],
  query?: Record<string, string>,
) {
  pool
    .intercept({
      path: (path) => {
        if (!path.startsWith(`/accounts/${accountId}/transactions`)) return false;
        if (!query) return true;
        const url = new URL(path, TELLER_ORIGIN);
        return Object.entries(query).every(([k, v]) => url.searchParams.get(k) === v);
      },
      method: "GET",
    })
    .reply(200, body);
}

beforeEach(() => {
  agent = new MockAgent();
  agent.disableNetConnect();
  pool = agent.get(TELLER_ORIGIN);
  setDispatcher(agent);
});

afterEach(async () => {
  await agent.close();
  setDispatcher(null);
});

describe("syncAccount", () => {
  const prisma = getPrisma();

  async function seedAccount() {
    const enrollment = await createTellerEnrollment({ accessToken: "tok_test" });
    const account = await createTellerAccount({
      id: "acc_1",
      enrollment: { connect: { id: enrollment.id } },
    });
    return { enrollment, account };
  }

  it("imports posted transactions and returns count", async () => {
    const { enrollment, account } = await seedAccount();
    await createBudget({ month: "2026-04" });

    interceptTransactions(account.id, [
      apiTransaction({ id: "t1", amount: "-12.34", date: "2026-04-15" }),
      apiTransaction({ id: "t2", amount: "-5.00", date: "2026-04-16" }),
    ]);

    const result = await syncAccount(account, enrollment);

    expect(result).toEqual({ imported: 2 });
    const stored = await prisma.tellerTransaction.findMany({ orderBy: { id: "asc" } });
    expect(stored.map((tx) => [tx.id, tx.amount, tx.date])).toEqual([
      ["t1", -1234, "2026-04-15"],
      ["t2", -500, "2026-04-16"],
    ]);
  });

  it("filters out pending transactions", async () => {
    const { enrollment, account } = await seedAccount();
    await createBudget({ month: "2026-04" });

    interceptTransactions(account.id, [
      apiTransaction({ id: "t_posted", status: "posted", date: "2026-04-15" }),
      apiTransaction({ id: "t_pending", status: "pending", date: "2026-04-16" }),
    ]);

    const result = await syncAccount(account, enrollment);

    expect(result.imported).toBe(1);
    const ids = pluck(await prisma.tellerTransaction.findMany(), "id");
    expect(ids).toEqual(["t_posted"]);
  });

  it("filters out transactions dated before the oldest budget", async () => {
    const { enrollment, account } = await seedAccount();
    await createBudget({ month: "2026-04" });

    interceptTransactions(account.id, [
      apiTransaction({ id: "t_old", date: "2026-03-25" }),
      apiTransaction({ id: "t_edge", date: "2026-04-01" }),
      apiTransaction({ id: "t_new", date: "2026-04-10" }),
    ]);

    const result = await syncAccount(account, enrollment);

    expect(result.imported).toBe(2);
    const ids = pluck(await prisma.tellerTransaction.findMany({ orderBy: { id: "asc" } }), "id");
    expect(ids).toEqual(["t_edge", "t_new"]);
  });

  it("requests transactions starting 10 days before oldest budget", async () => {
    const { enrollment, account } = await seedAccount();
    await createBudget({ month: "2026-04" });

    interceptTransactions(account.id, [], { start_date: "2026-03-22", count: "100" });

    await syncAccount(account, enrollment);

    expect(() => agent.assertNoPendingInterceptors()).not.toThrow();
  });

  it("uses counterparty name when present, falls back to description", async () => {
    const { enrollment, account } = await seedAccount();
    await createBudget({ month: "2026-04" });

    interceptTransactions(account.id, [
      apiTransaction({
        id: "t_cp",
        date: "2026-04-15",
        description: "raw memo",
        details: { counterparty: { name: "AMAZON" } },
      }),
      apiTransaction({
        id: "t_desc",
        date: "2026-04-16",
        description: "PAYPAL *MERCHANT",
        details: { counterparty: null },
      }),
    ]);

    await syncAccount(account, enrollment);

    const stored = await prisma.tellerTransaction.findMany({ orderBy: { id: "asc" } });
    expect(stored.map((t) => [t.id, t.vendor])).toEqual([
      ["t_cp", "AMAZON"],
      ["t_desc", "PAYPAL *MERCHANT"],
    ]);
  });

  it("paginates via from_id until a partial batch arrives", async () => {
    const { enrollment, account } = await seedAccount();
    await createBudget({ month: "2026-04" });

    const firstPage = range(100).map((i) => apiTransaction({ id: `p1_${i}`, date: "2026-04-15" }));
    const secondPage = range(3).map((i) => apiTransaction({ id: `p2_${i}`, date: "2026-04-16" }));

    interceptTransactions(account.id, firstPage, { count: "100" });
    interceptTransactions(account.id, secondPage, { from_id: "p1_99" });

    const result = await syncAccount(account, enrollment);

    expect(result.imported).toBe(103);
    expect(await prisma.tellerTransaction.count()).toBe(103);
  });

  it("skips duplicates so re-syncing is idempotent", async () => {
    const { enrollment, account } = await seedAccount();
    await createBudget({ month: "2026-04" });
    await createTellerTransaction({
      id: "t_existing",
      account: { connect: { id: account.id } },
      date: "2026-04-15",
      vendor: "OLD",
      amount: -100,
    });

    interceptTransactions(account.id, [
      apiTransaction({ id: "t_existing", date: "2026-04-15", amount: "-9.99" }),
      apiTransaction({ id: "t_new", date: "2026-04-16" }),
    ]);

    const result = await syncAccount(account, enrollment);

    expect(result.imported).toBe(1);
    const existing = await prisma.tellerTransaction.findUniqueOrThrow({
      where: { id: "t_existing" },
    });
    expect(existing.amount).toBe(-100);
    expect(existing.vendor).toBe("OLD");
  });

  it("updates lastSyncedAt", async () => {
    const { enrollment, account } = await seedAccount();
    await createBudget({ month: "2026-04" });
    interceptTransactions(account.id, []);

    expect(account.lastSyncedAt).toBeNull();
    const before = Date.now();
    await syncAccount(account, enrollment);
    const after = Date.now();

    const reloaded = await prisma.tellerAccount.findUniqueOrThrow({ where: { id: account.id } });
    expect(reloaded.lastSyncedAt).not.toBeNull();
    const ts = reloaded.lastSyncedAt!.getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("sends the access token in the Authorization header", async () => {
    const { enrollment, account } = await seedAccount();
    await createBudget({ month: "2026-04" });

    const expected = `Basic ${Buffer.from(`${enrollment.accessToken}:`).toString("base64")}`;
    pool
      .intercept({
        path: (p) => p.startsWith(`/accounts/${account.id}/transactions`),
        method: "GET",
        headers: { authorization: expected },
      })
      .reply(200, []);

    await expect(syncAccount(account, enrollment)).resolves.toEqual({ imported: 0 });
  });
});

describe("syncEnrollment", () => {
  const prisma = getPrisma();

  it("creates remote accounts then syncs only enabled accounts", async () => {
    await createBudget({ month: "2026-04" });
    const enrollment = await createTellerEnrollment({ accessToken: "tok_test" });
    await createTellerAccount({
      id: "acc_existing_disabled",
      enabled: false,
      enrollment: { connect: { id: enrollment.id } },
    });

    interceptAccounts([
      apiAccount({ id: "acc_existing_disabled", name: "Old", institution: { name: "BofA" } }),
      apiAccount({ id: "acc_new_enabled", name: "Savings", institution: { name: "Chase" } }),
    ]);
    interceptTransactions("acc_new_enabled", [apiTransaction({ id: "t_new", date: "2026-04-15" })]);

    const enrollmentWithAccounts = await prisma.tellerEnrollment.findUniqueOrThrow({
      where: { id: enrollment.id },
      include: { accounts: true },
    });

    const result = await syncEnrollment(enrollmentWithAccounts);

    expect(result).toEqual({ imported: 1 });

    const accounts = await prisma.tellerAccount.findMany({ orderBy: { id: "asc" } });
    expect(accounts.map((account) => [account.id, account.enabled])).toEqual([
      ["acc_existing_disabled", false],
      ["acc_new_enabled", true],
    ]);

    const txs = await prisma.tellerTransaction.findMany();
    expect(pluck(txs, "accountId")).toEqual(["acc_new_enabled"]);
  });

  it("sums imported counts across multiple enabled accounts", async () => {
    await createBudget({ month: "2026-04" });
    const enrollment = await createTellerEnrollment({ accessToken: "tok_test" });
    await createTellerAccount({
      id: "acc_a",
      enrollment: { connect: { id: enrollment.id } },
    });
    await createTellerAccount({
      id: "acc_b",
      enrollment: { connect: { id: enrollment.id } },
    });

    interceptAccounts([apiAccount({ id: "acc_a" }), apiAccount({ id: "acc_b" })]);
    interceptTransactions("acc_a", [
      apiTransaction({ id: "a1", date: "2026-04-10" }),
      apiTransaction({ id: "a2", date: "2026-04-11" }),
    ]);
    interceptTransactions("acc_b", [apiTransaction({ id: "b1", date: "2026-04-12" })]);

    const enrollmentWithAccounts = await prisma.tellerEnrollment.findUniqueOrThrow({
      where: { id: enrollment.id },
      include: { accounts: true },
    });

    const result = await syncEnrollment(enrollmentWithAccounts);

    expect(result.imported).toBe(3);
  });
});
