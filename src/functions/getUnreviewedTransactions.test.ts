import {
  createCategorizationRule,
  createCategory,
  createTellerAccount,
  createTellerTransaction,
} from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import { find, pluck, range } from "~/lib/collections";
import { getUnreviewedTransactions } from "./getUnreviewedTransactions.ts";

describe("getUnreviewedTransactions", () => {
  let accountId: string;
  let account: { connect: { id: string } };
  beforeEach(async () => {
    accountId = (await createTellerAccount()).id;
    account = { connect: { id: accountId } };
  });

  it("returns unreviewed transactions ordered by date desc with total", async () => {
    await Promise.all([
      createTellerTransaction({ date: "2025-01-10", vendor: "A", account }),
      createTellerTransaction({ date: "2025-01-20", vendor: "B", account }),
      createTellerTransaction({ date: "2025-01-15", vendor: "C", reviewed: true, account }),
    ]);

    const result = await getUnreviewedTransactions({ data: { page: 1, pageSize: 10 } });

    expect(result.total).toBe(2);
    expect(pluck(result.transactions, "vendor")).toEqual(["B", "A"]);
    expect(result.transactions[0].account.id).toBe(accountId);
  });

  it("paginates", async () => {
    await Promise.all(
      range(5).map((index) =>
        createTellerTransaction({ date: `2025-01-0${index + 1}`, vendor: `V${index}`, account }),
      ),
    );

    const [page1, page2, page3] = await Promise.all([
      getUnreviewedTransactions({ data: { page: 1, pageSize: 2 } }),
      getUnreviewedTransactions({ data: { page: 2, pageSize: 2 } }),
      getUnreviewedTransactions({ data: { page: 3, pageSize: 2 } }),
    ]);

    expect(page1.total).toBe(5);
    expect(pluck(page1.transactions, "vendor")).toEqual(["V4", "V3"]);
    expect(pluck(page2.transactions, "vendor")).toEqual(["V2", "V1"]);
    expect(pluck(page3.transactions, "vendor")).toEqual(["V0"]);
  });

  it("attaches matching categorization rule with category", async () => {
    const category = await createCategory({ name: "Shopping" });
    await Promise.all([
      createCategorizationRule({
        tellerVendor: "AMAZON",
        vendor: "Amazon",
        category: { connect: { id: category.id } },
      }),
      createTellerTransaction({ vendor: "AMAZON", account }),
      createTellerTransaction({ vendor: "UNKNOWN", account }),
    ]);

    const { transactions } = await getUnreviewedTransactions({ data: { page: 1, pageSize: 10 } });

    expect(find(transactions, "vendor", "AMAZON")?.rule).toEqual(
      expect.objectContaining({
        vendor: "Amazon",
        category: { id: category.id, name: "Shopping" },
      }),
    );
    expect(find(transactions, "vendor", "UNKNOWN")?.rule).toBeNull();
  });
});
