import { describe, expect, it } from "vitest";
import { createExternalAccount, createExternalTransaction, transaction } from "../../test/mocks.ts";
import { getUnreviewedTransactionCount } from "./getUnreviewedTransactionCount.ts";

describe("getUnreviewedTransactionCount", () => {
  it("counts unreviewed transactions and accepted transactions changed at the bank", async () => {
    const account = await createExternalAccount();
    const connect = { connect: { id: account.id } };
    await Promise.all([
      createExternalTransaction({ account: connect }),
      createExternalTransaction({ account: connect }),
      // Accepted and unchanged: not counted
      createExternalTransaction({
        account: connect,
        reviewed: true,
        transaction: { create: transaction() },
      }),
      // Accepted then changed at the bank: counted
      createExternalTransaction({
        account: connect,
        reviewed: true,
        changedAt: new Date(),
        transaction: { create: transaction() },
      }),
    ]);

    expect(await getUnreviewedTransactionCount()).toBe(3);
  });

  it("excludes unreviewed transactions Plaid has removed", async () => {
    const account = await createExternalAccount();
    const connect = { connect: { id: account.id } };
    await Promise.all([
      createExternalTransaction({ account: connect }),
      createExternalTransaction({ account: connect, removedAt: new Date() }),
    ]);

    expect(await getUnreviewedTransactionCount()).toBe(1);
  });

  it("still counts an accepted transaction that Plaid removed", async () => {
    const account = await createExternalAccount();
    await createExternalTransaction({
      account: { connect: { id: account.id } },
      reviewed: true,
      changedAt: new Date(),
      removedAt: new Date(),
      transaction: { create: transaction() },
    });

    expect(await getUnreviewedTransactionCount()).toBe(1);
  });
});
