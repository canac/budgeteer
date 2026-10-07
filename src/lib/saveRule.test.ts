import { createCategory, createVendorAlias, createVendorRule } from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { assertRuleSplits, saveRule } from "./saveRule.ts";

describe("saveRule", () => {
  const prisma = getPrisma();
  const externalTransaction = { vendor: "CHIPOTLE 1234", amount: -1245 };
  const externalVendor = externalTransaction.vendor;

  const save = (options: Omit<Parameters<typeof saveRule>[0], "tx" | "externalTransaction">) =>
    saveRule({ tx: prisma, externalTransaction, ...options });

  const alias = () => prisma.vendorAlias.findUnique({ where: { externalVendor } });
  const vendorRule = () => prisma.vendorRule.findUnique({ where: { externalVendor } });
  const amountRules = () =>
    prisma.amountRule.findMany({
      where: { externalVendor },
      orderBy: { amount: "asc" },
      include: { splits: true },
    });

  let dining = "";
  let fun = "";

  beforeEach(async () => {
    const [diningCategory, funCategory] = await Promise.all([
      createCategory({ name: "Dining" }),
      createCategory({ name: "Fun" }),
    ]);
    dining = diningCategory.id;
    fun = funCategory.id;
  });

  describe("the alias", () => {
    it("stores the new alias", async () => {
      await save({ newVendorAlias: "Chipotle", scope: "none", splits: [] });

      expect(await alias()).toMatchObject({ vendor: "Chipotle" });
    });

    it("stores no alias when there is no new one", async () => {
      await save({
        newVendorAlias: null,
        scope: "amount",
        splits: [],
      });

      expect(await alias()).toBeNull();
    });

    it("leaves an existing alias alone when there is no new one", async () => {
      await createVendorAlias({ externalVendor, vendor: "Chipotle" });

      await save({
        newVendorAlias: null,
        scope: "vendor",
        splits: [{ categoryId: dining, amount: -1245 }],
      });

      expect(await alias()).toMatchObject({ vendor: "Chipotle" });
    });

    it("stores no alias for a name equal to the bank vendor", async () => {
      await save({ newVendorAlias: externalVendor, scope: "none", splits: [] });

      expect(await alias()).toBeNull();
    });

    it("clears an existing alias renamed back to the bank vendor", async () => {
      await createVendorAlias({ externalVendor, vendor: "Chipotle" });

      await save({ newVendorAlias: externalVendor, scope: "none", splits: [] });

      expect(await alias()).toBeNull();
    });
  });

  describe("vendor scope", () => {
    it("clears a dismissal when saving a category", async () => {
      await createVendorRule({ externalVendor });

      await save({
        newVendorAlias: "Chipotle",
        scope: "vendor",
        splits: [{ categoryId: dining, amount: -1245 }],
      });

      expect(await vendorRule()).toMatchObject({ categoryId: dining });
    });

    it("clears the category when saving a dismissal", async () => {
      await createVendorRule({ externalVendor, category: { connect: { id: dining } } });

      await save({
        newVendorAlias: "Chipotle",
        scope: "vendor",
        splits: [],
      });

      expect(await vendorRule()).toMatchObject({ categoryId: null });
    });

    it("saves a multi-category split as an amount rule", async () => {
      await save({
        newVendorAlias: null,
        scope: "vendor",
        splits: [
          { categoryId: dining, amount: -845 },
          { categoryId: fun, amount: -400 },
        ],
      });

      expect(await vendorRule()).toBeNull();
      const [rule] = await amountRules();
      expect(rule?.splits).toHaveLength(2);
    });
  });

  describe("amount scope", () => {
    it("creates the amount rule and its splits", async () => {
      await save({
        newVendorAlias: "Chipotle",
        scope: "amount",
        splits: [
          { categoryId: dining, amount: -845 },
          { categoryId: fun, amount: -400 },
        ],
      });

      const [rule, ...rest] = await amountRules();
      expect(rest).toEqual([]);
      expect(rule).toMatchObject({ amount: -1245 });
      expect(rule?.splits.map(({ categoryId, amount }) => ({ categoryId, amount }))).toEqual(
        expect.arrayContaining([
          { categoryId: dining, amount: -845 },
          { categoryId: fun, amount: -400 },
        ]),
      );
    });

    it("stores a lone split with the whole rule amount", async () => {
      await save({
        newVendorAlias: "Chipotle",
        scope: "amount",
        splits: [{ categoryId: dining, amount: -1245 }],
      });

      const [rule] = await amountRules();
      expect(rule?.splits).toEqual([
        expect.objectContaining({ categoryId: dining, amount: -1245 }),
      ]);
    });

    it("replaces the splits of an existing amount rule without replacing the rule", async () => {
      await save({
        newVendorAlias: "Chipotle",
        scope: "amount",
        splits: [
          { categoryId: dining, amount: -845 },
          { categoryId: fun, amount: -400 },
        ],
      });
      const [before] = await amountRules();

      await save({
        newVendorAlias: "Chipotle",
        scope: "amount",
        splits: [{ categoryId: dining, amount: -1245 }],
      });

      const [after] = await amountRules();
      expect(after?.id).toBe(before?.id);
      expect(after?.splits).toHaveLength(1);
    });

    it("deletes the splits when saving a dismissal", async () => {
      await save({
        newVendorAlias: "Chipotle",
        scope: "amount",
        splits: [{ categoryId: dining, amount: -1245 }],
      });

      await save({
        newVendorAlias: "Chipotle",
        scope: "amount",
        splits: [],
      });

      const [rule] = await amountRules();
      expect(rule?.splits).toEqual([]);
    });

    it("leaves the vendor-level outcome alone", async () => {
      await createVendorRule({ externalVendor, category: { connect: { id: dining } } });

      await save({
        newVendorAlias: "Chipotle",
        scope: "amount",
        splits: [],
      });

      expect(await vendorRule()).toMatchObject({ categoryId: dining });
    });
  });

  describe("no scope", () => {
    it("leaves an existing outcome untouched", async () => {
      await createVendorRule({ externalVendor, category: { connect: { id: dining } } });

      await save({ newVendorAlias: "Chipotle", scope: "none", splits: [] });

      expect(await alias()).toMatchObject({ vendor: "Chipotle" });
      expect(await vendorRule()).toMatchObject({ categoryId: dining });
    });

    it("creates nothing when there is no alias to save", async () => {
      await save({ newVendorAlias: null, scope: "none", splits: [] });

      expect(await alias()).toBeNull();
      expect(await vendorRule()).toBeNull();
      expect(await amountRules()).toEqual([]);
    });
  });

  describe("invariants", () => {
    it("rejects splits that do not sum to the rule amount", () => {
      expect(() => assertRuleSplits([{ categoryId: "dining", amount: -1000 }], -1245)).toThrow(
        "Rule splits must sum to the rule amount",
      );
    });

    it("rejects a zero-amount split", () => {
      expect(() =>
        assertRuleSplits(
          [
            { categoryId: "dining", amount: -1245 },
            { categoryId: "fun", amount: 0 },
          ],
          -1245,
        ),
      ).toThrow("Rule splits must be non-zero and match the sign of the rule amount");
    });

    it("rejects a split whose sign differs from the rule amount", () => {
      expect(() =>
        assertRuleSplits(
          [
            { categoryId: "dining", amount: -2000 },
            { categoryId: "fun", amount: 755 },
          ],
          -1245,
        ),
      ).toThrow("Rule splits must be non-zero and match the sign of the rule amount");
    });

    it("rejects duplicate split categories", () => {
      expect(() =>
        assertRuleSplits(
          [
            { categoryId: "dining", amount: -645 },
            { categoryId: "dining", amount: -600 },
          ],
          -1245,
        ),
      ).toThrow("Rule splits must use distinct categories");
    });

    it("accepts an empty split list, which dismisses", () => {
      expect(() => assertRuleSplits([], -1245)).not.toThrow();
    });

    it("writes nothing when the splits are invalid", async () => {
      await expect(
        save({
          newVendorAlias: "Chipotle",
          scope: "amount",
          splits: [{ categoryId: dining, amount: -1 }],
        }),
      ).rejects.toThrow("Rule splits must sum to the rule amount");

      expect(await alias()).toBeNull();
      expect(await amountRules()).toEqual([]);
    });
  });
});
