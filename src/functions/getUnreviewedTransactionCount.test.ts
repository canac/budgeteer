import { createTellerAccount, createTellerTransaction } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { getUnreviewedTransactionCount } from "./getUnreviewedTransactionCount.ts";

describe("getUnreviewedTransactionCount", () => {
  it("counts only unreviewed transactions", async () => {
    const account = await createTellerAccount();
    const connect = { connect: { id: account.id } };
    await Promise.all([
      createTellerTransaction({ account: connect }),
      createTellerTransaction({ account: connect }),
      createTellerTransaction({ account: connect, reviewed: true }),
    ]);

    expect(await getUnreviewedTransactionCount()).toBe(2);
  });
});
