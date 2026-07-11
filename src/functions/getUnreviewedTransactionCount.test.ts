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
});
