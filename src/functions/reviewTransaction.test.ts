import {
  createAmountRule,
  createCategory,
  createExternalTransaction,
  createVendorAlias,
  createVendorRule,
} from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import type { RuleScope, RuleSplit } from "~/lib/saveRule.ts";
import type { ExternalTransaction } from "~/prisma/client.ts";
import { getPrisma } from "../../test/helpers.ts";
import { reviewTransaction } from "./reviewTransaction.ts";

describe("reviewTransaction", () => {
  const prisma = getPrisma();

  let external: ExternalTransaction;
  beforeEach(async () => {
    external = await createExternalTransaction({
      amount: -1000,
      vendor: "AMZN MKTP",
      date: "2025-01-15",
    });
  });

  const accept = (
    decision: {
      vendor?: string;
      description?: string;
      updateAlias?: boolean;
      splits: RuleSplit[];
    },
    ruleScope?: RuleScope,
  ) =>
    reviewTransaction({
      data: {
        id: external.id,
        ...(ruleScope ? { ruleScope } : {}),
        decision: { type: "accept", vendor: "Amazon", updateAlias: false, ...decision },
      },
    });

  const dismiss = (ruleScope?: RuleScope) =>
    reviewTransaction({
      data: { id: external.id, ...(ruleScope ? { ruleScope } : {}), decision: { type: "dismiss" } },
    });

  const alias = (vendor: string) => createVendorAlias({ externalVendor: external.vendor, vendor });

  const vendorRule = (categoryId?: string) =>
    createVendorRule({
      externalVendor: external.vendor,
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
    });

  const amountRule = (amount: number, splits: Array<{ categoryId: string; amount: number }>) =>
    createAmountRule({
      externalVendor: external.vendor,
      amount,
      splits: { create: splits },
    });

  const savedAlias = () =>
    prisma.vendorAlias.findUnique({ where: { externalVendor: external.vendor } });

  const savedVendorRule = () =>
    prisma.vendorRule.findUnique({ where: { externalVendor: external.vendor } });

  const savedAmountRules = () =>
    prisma.amountRule.findMany({
      where: { externalVendor: external.vendor },
      orderBy: { amount: "asc" },
      include: { splits: true },
    });

  const categoriesOf = async (transactionId: string) =>
    (
      await prisma.transactionCategory.findMany({
        where: { transactionId },
        orderBy: { amount: "asc" },
      })
    ).map(({ categoryId, amount }) => ({ categoryId, amount }));

  describe("accepting", () => {
    it("rejects a decision with no categories", async () => {
      await expect(() => accept({ splits: [] })).rejects.toThrow("Too small");
      expect(await prisma.transaction.count()).toBe(0);
    });

    it("creates a transaction with split categories", async () => {
      const [category1, category2] = await Promise.all([createCategory(), createCategory()]);

      const transaction = await accept({
        splits: [
          { categoryId: category1.id, amount: -700 },
          { categoryId: category2.id, amount: -300 },
        ],
      });

      expect(transaction?.vendor).toBe("Amazon");
      expect(await categoriesOf(transaction!.id)).toEqual([
        { categoryId: category1.id, amount: -700 },
        { categoryId: category2.id, amount: -300 },
      ]);
      expect(await savedAlias()).toBeNull();
      expect(await savedVendorRule()).toBeNull();
    });

    it("sets the description", async () => {
      const category = await createCategory();

      const transaction = await accept({
        description: "Birthday gift",
        splits: [{ categoryId: category.id, amount: -1000 }],
      });

      expect(transaction?.description).toBe("Birthday gift");
    });

    it("rejects an accept whose amount no longer matches what the client saw", async () => {
      const category = await createCategory();
      await prisma.externalTransaction.update({
        where: { id: external.id },
        data: { amount: -1345 },
      });

      await expect(() =>
        accept({ splits: [{ categoryId: category.id, amount: -1000 }] }),
      ).rejects.toThrow("This transaction changed at the bank");
      expect(await prisma.transaction.count()).toBe(0);
    });

    it("renames without touching the outcome when no scope is given", async () => {
      const [oldCategory, newCategory] = await Promise.all([createCategory(), createCategory()]);
      await Promise.all([alias("OldVendor"), vendorRule(oldCategory.id)]);

      await accept({
        vendor: "NewVendor",
        updateAlias: true,
        splits: [{ categoryId: newCategory.id, amount: -1000 }],
      });

      expect(await savedAlias()).toMatchObject({ vendor: "NewVendor" });
      expect(await savedVendorRule()).toMatchObject({ categoryId: oldCategory.id });
    });

    it("creates a vendor rule when the scope is the vendor", async () => {
      const category = await createCategory();

      await accept(
        { updateAlias: true, splits: [{ categoryId: category.id, amount: -1000 }] },
        "vendor",
      );

      expect(await savedAlias()).toMatchObject({ vendor: "Amazon" });
      expect(await savedVendorRule()).toMatchObject({ categoryId: category.id });
    });

    it("clears a dismissing vendor rule when a category is saved for it", async () => {
      const category = await createCategory();
      await vendorRule();

      await accept({ splits: [{ categoryId: category.id, amount: -1000 }] }, "vendor");

      expect(await savedVendorRule()).toMatchObject({ categoryId: category.id });
    });

    it("saves a vendor-scoped split as an amount rule", async () => {
      const [category1, category2] = await Promise.all([createCategory(), createCategory()]);

      await accept(
        {
          splits: [
            { categoryId: category1.id, amount: -700 },
            { categoryId: category2.id, amount: -300 },
          ],
        },
        "vendor",
      );

      expect(await savedVendorRule()).toBeNull();
      const [rule, ...rest] = await savedAmountRules();
      expect(rest).toEqual([]);
      expect(rule).toMatchObject({ amount: -1000 });
      expect(rule?.splits).toHaveLength(2);
    });
  });

  describe("saving amount-scoped rules", () => {
    it("creates an amount rule with splits and leaves the vendor rule's category alone", async () => {
      const [oldCategory, category1, category2] = await Promise.all([
        createCategory(),
        createCategory(),
        createCategory(),
      ]);
      await Promise.all([alias("Amazon"), vendorRule(oldCategory.id)]);

      await accept(
        {
          updateAlias: true,
          splits: [
            { categoryId: category1.id, amount: -700 },
            { categoryId: category2.id, amount: -300 },
          ],
        },
        "amount",
      );

      expect(await savedVendorRule()).toMatchObject({ categoryId: oldCategory.id });
      const [rule, ...rest] = await savedAmountRules();
      expect(rest).toEqual([]);
      expect(rule).toMatchObject({ amount: -1000 });
      expect(rule?.splits.map(({ categoryId, amount }) => ({ categoryId, amount }))).toEqual(
        expect.arrayContaining([
          { categoryId: category1.id, amount: -700 },
          { categoryId: category2.id, amount: -300 },
        ]),
      );
    });

    it("creates no vendor rule when the outcome is amount-scoped", async () => {
      const category = await createCategory();

      await accept(
        { updateAlias: true, splits: [{ categoryId: category.id, amount: -1000 }] },
        "amount",
      );

      expect(await savedAlias()).toMatchObject({ vendor: "Amazon" });
      expect(await savedVendorRule()).toBeNull();
      const [rule] = await savedAmountRules();
      expect(rule?.splits).toMatchObject([{ categoryId: category.id, amount: -1000 }]);
    });

    it("stores no alias when the rename was not requested", async () => {
      const category = await createCategory();

      await accept({ splits: [{ categoryId: category.id, amount: -1000 }] }, "amount");

      expect(await savedAlias()).toBeNull();
      expect(await savedAmountRules()).toHaveLength(1);
    });

    it("replaces the splits of an existing amount rule", async () => {
      const [category, newCategory] = await Promise.all([createCategory(), createCategory()]);
      await amountRule(-1000, [{ categoryId: category.id, amount: -1000 }]);

      await accept({ splits: [{ categoryId: newCategory.id, amount: -1000 }] }, "amount");

      const rules = await savedAmountRules();
      expect(rules).toHaveLength(1);
      expect(rules[0]?.splits).toMatchObject([{ categoryId: newCategory.id, amount: -1000 }]);
    });
  });

  describe("dismissing", () => {
    it("marks the transaction reviewed without creating a transaction", async () => {
      await dismiss();

      expect(
        await prisma.externalTransaction.findUniqueOrThrow({ where: { id: external.id } }),
      ).toMatchObject({ reviewed: true });
      expect(await prisma.transaction.count()).toBe(0);
    });

    it("saves no rule by default", async () => {
      await dismiss();

      expect(await savedVendorRule()).toBeNull();
      expect(await savedAmountRules()).toEqual([]);
    });

    it("creates a dismissing vendor rule without an alias", async () => {
      await dismiss("vendor");

      expect(await savedAlias()).toBeNull();
      expect(await savedVendorRule()).toMatchObject({ categoryId: null });
    });

    it("clears an existing category when dismissing the vendor", async () => {
      const category = await createCategory();
      await Promise.all([alias("Amazon"), vendorRule(category.id)]);

      await dismiss("vendor");

      expect(await savedAlias()).toMatchObject({ vendor: "Amazon" });
      expect(await savedVendorRule()).toMatchObject({ categoryId: null });
    });

    it("creates a dismissing amount rule and no vendor rule", async () => {
      await dismiss("amount");

      expect(await savedVendorRule()).toBeNull();
      expect(await savedAmountRules()).toMatchObject([{ amount: -1000, splits: [] }]);
    });

    it("keeps an existing alias when dismissing one amount", async () => {
      await alias("Amazon");

      await dismiss("amount");

      expect(await savedAlias()).toMatchObject({ vendor: "Amazon" });
    });

    it("deletes the splits of an amount rule that starts dismissing", async () => {
      const category = await createCategory();
      await amountRule(-1000, [{ categoryId: category.id, amount: -1000 }]);

      await dismiss("amount");

      const [rule, ...rest] = await savedAmountRules();
      expect(rest).toEqual([]);
      expect(rule?.splits).toEqual([]);
    });

    it("saves no rule for a transaction that does not exist", async () => {
      await expect(() =>
        reviewTransaction({
          data: { id: "missing", ruleScope: "vendor", decision: { type: "dismiss" } },
        }),
      ).rejects.toThrow(/Invalid `prisma.externalTransaction/);

      expect(await prisma.vendorRule.count()).toBe(0);
    });
  });
});
