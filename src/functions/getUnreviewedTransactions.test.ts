import {
  createAmountRule,
  createCategory,
  createExternalAccount,
  createExternalTransaction,
  createVendorAlias,
  createVendorRule,
  transaction,
} from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import type { AmountRule, StoredSplit, VendorRules } from "~/lib/ruleLookup";
import { find, pluck, range } from "~/lib/collections";
import { getUnreviewedTransactions, suggestRule } from "./getUnreviewedTransactions.ts";

describe("getUnreviewedTransactions", () => {
  let accountId: string;
  let account: { connect: { id: string } };
  beforeEach(async () => {
    accountId = (await createExternalAccount()).id;
    account = { connect: { id: accountId } };
  });

  it("returns unreviewed transactions ordered by date desc with total", async () => {
    await Promise.all([
      createExternalTransaction({ date: "2025-01-10", vendor: "A", account }),
      createExternalTransaction({ date: "2025-01-20", vendor: "B", account }),
      createExternalTransaction({ date: "2025-01-15", vendor: "C", reviewed: true, account }),
    ]);

    const result = await getUnreviewedTransactions({ data: { page: 1, pageSize: 10 } });

    expect(result.total).toBe(2);
    expect(pluck(result.transactions, "vendor")).toEqual(["B", "A"]);
    expect(result.transactions[0]!.account.id).toBe(accountId);
  });

  it("returns only dismissed transactions when view is dismissed", async () => {
    await Promise.all([
      createExternalTransaction({ vendor: "Pending", account }),
      createExternalTransaction({ vendor: "Dismissed", reviewed: true, account }),
      createExternalTransaction({
        vendor: "Accepted",
        reviewed: true,
        transaction: { create: transaction() },
        account,
      }),
    ]);

    const result = await getUnreviewedTransactions({
      data: { page: 1, pageSize: 10, view: "dismissed" },
    });
    expect(pluck(result.transactions, "vendor")).toEqual(["Dismissed"]);
  });

  it("returns only accepted transactions flagged as changed when view is changed", async () => {
    await Promise.all([
      createExternalTransaction({ vendor: "Pending", account }),
      createExternalTransaction({ vendor: "Dismissed", reviewed: true, account }),
      createExternalTransaction({
        vendor: "AcceptedUnchanged",
        reviewed: true,
        transaction: { create: transaction() },
        account,
      }),
      createExternalTransaction({
        vendor: "AcceptedChanged",
        reviewed: true,
        changedAt: new Date(),
        transaction: { create: transaction() },
        account,
      }),
    ]);

    const result = await getUnreviewedTransactions({
      data: { page: 1, pageSize: 10, view: "changed" },
    });
    expect(pluck(result.transactions, "vendor")).toEqual(["AcceptedChanged"]);
  });

  it("paginates", async () => {
    await Promise.all(
      range(5).map((index) =>
        createExternalTransaction({ date: `2025-01-0${index + 1}`, vendor: `V${index}`, account }),
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

  it("filters by external account", async () => {
    const otherAccount = { connect: { id: (await createExternalAccount()).id } };
    await Promise.all([
      createExternalTransaction({ vendor: "Mine", account }),
      createExternalTransaction({ vendor: "Theirs", account: otherAccount }),
    ]);

    const result = await getUnreviewedTransactions({ data: { page: 1, pageSize: 10, accountId } });

    expect(result.total).toBe(1);
    expect(pluck(result.transactions, "vendor")).toEqual(["Mine"]);
  });

  it("combines the external account filter with the view", async () => {
    const otherAccount = { connect: { id: (await createExternalAccount()).id } };
    await Promise.all([
      createExternalTransaction({ vendor: "Pending", account }),
      createExternalTransaction({ vendor: "Dismissed", reviewed: true, account }),
      createExternalTransaction({
        vendor: "DismissedElsewhere",
        reviewed: true,
        account: otherAccount,
      }),
    ]);

    const result = await getUnreviewedTransactions({
      data: { page: 1, pageSize: 10, view: "dismissed", accountId },
    });

    expect(pluck(result.transactions, "vendor")).toEqual(["Dismissed"]);
  });

  it("suggests the vendor rule's category with no amount of its own", async () => {
    const category = await createCategory({ name: "Shopping" });
    await Promise.all([
      createVendorAlias({ externalVendor: "AMAZON", vendor: "Amazon" }),
      createVendorRule({ externalVendor: "AMAZON", category: { connect: { id: category.id } } }),
      createExternalTransaction({ vendor: "AMAZON", amount: -1000, account }),
      createExternalTransaction({ vendor: "UNKNOWN", account }),
    ]);

    const { transactions } = await getUnreviewedTransactions({ data: { page: 1, pageSize: 10 } });

    expect(find(transactions, "vendor", "AMAZON")?.suggestion).toEqual({
      vendorAlias: "Amazon",
      outcome: {
        type: "categorize",
        splits: [{ category: { id: category.id, name: "Shopping" }, amount: -1000 }],
      },
      amountRule: false,
    });
    expect(find(transactions, "vendor", "UNKNOWN")?.suggestion).toBeNull();
  });

  it("suggests dismissing for a dismissing vendor rule", async () => {
    await Promise.all([
      createVendorAlias({ externalVendor: "BKVERIFY 88", vendor: "Bank Verify" }),
      createVendorRule({ externalVendor: "BKVERIFY 88" }),
      createExternalTransaction({ vendor: "BKVERIFY 88", amount: -1, account }),
    ]);

    const { transactions } = await getUnreviewedTransactions({ data: { page: 1, pageSize: 10 } });

    expect(transactions[0]?.suggestion).toEqual({
      vendorAlias: "Bank Verify",
      outcome: { type: "dismiss" },
      amountRule: false,
    });
  });

  it("attaches suggestions in the dismissed view too", async () => {
    await Promise.all([
      createVendorAlias({ externalVendor: "BKVERIFY 88", vendor: "Bank Verify" }),
      createVendorRule({ externalVendor: "BKVERIFY 88" }),
      createExternalTransaction({ vendor: "BKVERIFY 88", amount: -1, reviewed: true, account }),
    ]);

    const { transactions } = await getUnreviewedTransactions({
      data: { page: 1, pageSize: 10, view: "dismissed" },
    });

    expect(transactions[0]?.suggestion).toMatchObject({
      outcome: { type: "dismiss" },
      amountRule: false,
    });
  });

  it("excludes transactions Plaid has removed from the unreviewed and dismissed views", async () => {
    await Promise.all([
      createExternalTransaction({ vendor: "Live", account }),
      createExternalTransaction({ vendor: "Removed", removedAt: new Date(), account }),
      createExternalTransaction({ vendor: "Dismissed", reviewed: true, account }),
      createExternalTransaction({
        vendor: "DismissedThenRemoved",
        reviewed: true,
        removedAt: new Date(),
        account,
      }),
    ]);

    const unreviewed = await getUnreviewedTransactions({ data: { page: 1, pageSize: 10 } });
    const dismissed = await getUnreviewedTransactions({
      data: { page: 1, pageSize: 10, view: "dismissed" },
    });

    expect(pluck(unreviewed.transactions, "vendor")).toEqual(["Live"]);
    expect(unreviewed.total).toBe(1);
    expect(pluck(dismissed.transactions, "vendor")).toEqual(["Dismissed"]);
  });

  it("still shows an accepted transaction that Plaid removed under the changed view", async () => {
    await createExternalTransaction({
      vendor: "AcceptedThenRemoved",
      reviewed: true,
      changedAt: new Date(),
      removedAt: new Date(),
      transaction: { create: transaction() },
      account,
    });

    const { transactions } = await getUnreviewedTransactions({
      data: { page: 1, pageSize: 10, view: "changed" },
    });

    expect(pluck(transactions, "vendor")).toEqual(["AcceptedThenRemoved"]);
  });

  it("suggests the amount rule's splits for transactions of that amount", async () => {
    const [vendorCategory, groceries, snacks] = await Promise.all([
      createCategory({ name: "Shopping" }),
      createCategory({ name: "Groceries" }),
      createCategory({ name: "Snacks" }),
    ]);
    await Promise.all([
      createVendorAlias({ externalVendor: "COSTCO", vendor: "Costco" }),
      createVendorRule({
        externalVendor: "COSTCO",
        category: { connect: { id: vendorCategory.id } },
      }),
    ]);
    await Promise.all([
      createAmountRule({
        externalVendor: "COSTCO",
        amount: -6000,
        splits: {
          create: [
            { categoryId: groceries.id, amount: -5000 },
            { categoryId: snacks.id, amount: -1000 },
          ],
        },
      }),
      createExternalTransaction({ vendor: "COSTCO", amount: -6000, account }),
      createExternalTransaction({ vendor: "COSTCO", amount: -2500, account }),
      createExternalTransaction({ vendor: "COSTCO", amount: 6000, account }),
    ]);

    const { transactions } = await getUnreviewedTransactions({ data: { page: 1, pageSize: 10 } });

    expect(find(transactions, "amount", -6000)?.suggestion).toEqual({
      vendorAlias: "Costco",
      outcome: {
        type: "categorize",
        splits: [
          { category: { id: groceries.id, name: "Groceries" }, amount: -5000 },
          { category: { id: snacks.id, name: "Snacks" }, amount: -1000 },
        ],
      },
      amountRule: true,
    });
    const vendorFallback = (amount: number) => ({
      vendorAlias: "Costco",
      outcome: {
        type: "categorize",
        splits: [{ category: { id: vendorCategory.id, name: "Shopping" }, amount }],
      },
      amountRule: false,
    });
    expect(find(transactions, "amount", -2500)?.suggestion).toEqual(vendorFallback(-2500));
    expect(find(transactions, "amount", 6000)?.suggestion).toEqual(vendorFallback(6000));
  });
});

describe("suggestRule", () => {
  const groceries = { id: "groceries", name: "Groceries" };
  const gas = { id: "gas", name: "Gas" };
  const snacks = { id: "snacks", name: "Snacks" };

  const amount = -2500;
  const rules = (fields: Partial<VendorRules>): VendorRules => ({
    externalVendor: "COSTCO WHSE",
    vendorAlias: null,
    vendorRule: null,
    amountRules: [],
    ...fields,
  });
  const amountRule = (splits: StoredSplit[], ruleAmount = amount): AmountRule => ({
    id: `amount-rule-${ruleAmount}`,
    amount: ruleAmount,
    outcome: splits.length > 0 ? { type: "categorize", splits } : { type: "dismiss" },
  });

  it("returns null when the vendor has nothing stored", () => {
    expect(suggestRule(rules({}), amount)).toBeNull();
  });

  it("suggests nothing but a rename for an alias with no rule", () => {
    expect(suggestRule(rules({ vendorAlias: "Costco" }), amount)).toEqual({
      vendorAlias: "Costco",
      outcome: null,
      amountRule: false,
    });
  });

  it("reports a null vendor when there is no alias", () => {
    expect(
      suggestRule(
        rules({ vendorRule: { type: "categorize", splits: [{ category: groceries }] } }),
        amount,
      ),
    ).toEqual({
      vendorAlias: null,
      outcome: {
        type: "categorize",
        splits: [{ category: groceries, amount }],
      },
      amountRule: false,
    });
  });

  it("gives the vendor rule's category the whole transaction amount", () => {
    expect(
      suggestRule(
        rules({
          vendorAlias: "Costco",
          vendorRule: { type: "categorize", splits: [{ category: groceries }] },
        }),
        amount,
      ),
    ).toEqual({
      vendorAlias: "Costco",
      outcome: {
        type: "categorize",
        splits: [{ category: groceries, amount }],
      },
      amountRule: false,
    });
  });

  it("suggests dismissing for a dismissing vendor rule", () => {
    expect(
      suggestRule(rules({ vendorAlias: "Bank Verify", vendorRule: { type: "dismiss" } }), amount),
    ).toEqual({
      vendorAlias: "Bank Verify",
      outcome: { type: "dismiss" },
      amountRule: false,
    });
  });

  it("lets a categorizing amount rule override a categorizing vendor rule", () => {
    expect(
      suggestRule(
        rules({
          vendorAlias: "Costco",
          vendorRule: { type: "categorize", splits: [{ category: groceries }] },
          amountRules: [amountRule([{ category: gas, amount }])],
        }),
        amount,
      ),
    ).toEqual({
      vendorAlias: "Costco",
      outcome: { type: "categorize", splits: [{ category: gas, amount }] },
      amountRule: true,
    });
  });

  it("keeps every split of a multi-category amount rule", () => {
    const splits = [
      { category: groceries, amount: -2000 },
      { category: snacks, amount: -500 },
    ];

    expect(
      suggestRule(rules({ vendorAlias: "Costco", amountRules: [amountRule(splits)] }), amount),
    ).toEqual({
      vendorAlias: "Costco",
      outcome: { type: "categorize", splits },
      amountRule: true,
    });
  });

  it("lets a dismissing amount rule override a categorizing vendor rule", () => {
    expect(
      suggestRule(
        rules({
          vendorAlias: "Costco",
          vendorRule: { type: "categorize", splits: [{ category: groceries }] },
          amountRules: [amountRule([])],
        }),
        amount,
      ),
    ).toEqual({
      vendorAlias: "Costco",
      outcome: { type: "dismiss" },
      amountRule: true,
    });
  });

  it("lets a categorizing amount rule override a dismissing vendor rule", () => {
    expect(
      suggestRule(
        rules({
          vendorAlias: "Costco",
          vendorRule: { type: "dismiss" },
          amountRules: [amountRule([{ category: gas, amount }])],
        }),
        amount,
      ),
    ).toEqual({
      vendorAlias: "Costco",
      outcome: { type: "categorize", splits: [{ category: gas, amount }] },
      amountRule: true,
    });
  });

  it("ignores an amount rule for a different amount", () => {
    expect(
      suggestRule(
        rules({
          vendorAlias: "Costco",
          vendorRule: { type: "categorize", splits: [{ category: groceries }] },
          amountRules: [amountRule([], -100)],
        }),
        amount,
      ),
    ).toEqual({
      vendorAlias: "Costco",
      outcome: {
        type: "categorize",
        splits: [{ category: groceries, amount }],
      },
      amountRule: false,
    });
  });

  it("returns null when the vendor's only rules are for other amounts", () => {
    expect(suggestRule(rules({ amountRules: [amountRule([], -100)] }), amount)).toBeNull();
  });
});
