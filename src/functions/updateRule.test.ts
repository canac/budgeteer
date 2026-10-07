import {
  createAmountRule,
  createAmountRuleSplit,
  createCategory,
  createVendorAlias,
  createVendorRule,
} from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { updateRule } from "./updateRule.ts";

describe("updateRule", () => {
  const prisma = getPrisma();
  const externalVendor = "CHIPOTLE 1234";

  const alias = () => prisma.vendorAlias.findUnique({ where: { externalVendor } });
  const vendorRule = () => prisma.vendorRule.findUnique({ where: { externalVendor } });

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

  describe("vendor scope", () => {
    it("stores the alias and the category", async () => {
      await updateRule({
        data: {
          scope: "vendor",
          externalVendor,
          vendor: "Chipotle",
          outcome: { type: "categorize", categoryId: dining },
        },
      });

      expect(await alias()).toMatchObject({ vendor: "Chipotle" });
      expect(await vendorRule()).toMatchObject({ categoryId: dining });
    });

    it("deletes the outcome for a rename-only rule, keeping the alias", async () => {
      await createVendorAlias({ externalVendor, vendor: "Chipotle" });
      await createVendorRule({ externalVendor, category: { connect: { id: dining } } });

      await updateRule({
        data: { scope: "vendor", externalVendor, vendor: "Chipotle", outcome: { type: "none" } },
      });

      expect(await alias()).toMatchObject({ vendor: "Chipotle" });
      expect(await vendorRule()).toBeNull();
    });

    it("clears the category when the rule starts dismissing", async () => {
      await createVendorRule({ externalVendor, category: { connect: { id: dining } } });

      await updateRule({
        data: { scope: "vendor", externalVendor, vendor: null, outcome: { type: "dismiss" } },
      });

      expect(await vendorRule()).toMatchObject({ categoryId: null });
    });

    it("clears the dismissal when a category is set", async () => {
      await createVendorRule({ externalVendor });

      await updateRule({
        data: {
          scope: "vendor",
          externalVendor,
          vendor: null,
          outcome: { type: "categorize", categoryId: fun },
        },
      });

      expect(await vendorRule()).toMatchObject({ categoryId: fun });
    });

    it("stores no alias for a name equal to the bank vendor", async () => {
      await updateRule({
        data: {
          scope: "vendor",
          externalVendor,
          vendor: externalVendor,
          outcome: { type: "dismiss" },
        },
      });

      expect(await alias()).toBeNull();
    });

    it("clears an existing alias renamed back to the bank vendor", async () => {
      await createVendorAlias({ externalVendor, vendor: "Chipotle" });

      await updateRule({
        data: {
          scope: "vendor",
          externalVendor,
          vendor: externalVendor,
          outcome: { type: "dismiss" },
        },
      });

      expect(await alias()).toBeNull();
    });

    it("deletes the alias when the vendor is cleared", async () => {
      await createVendorAlias({ externalVendor, vendor: "Chipotle" });

      await updateRule({
        data: { scope: "vendor", externalVendor, vendor: null, outcome: { type: "dismiss" } },
      });

      expect(await alias()).toBeNull();
    });

    it("leaves amount rules alone", async () => {
      await createAmountRule({ externalVendor, amount: -1245 });

      await updateRule({
        data: { scope: "vendor", externalVendor, vendor: null, outcome: { type: "dismiss" } },
      });

      expect(await prisma.amountRule.count({ where: { externalVendor } })).toBe(1);
    });

    it("rejects a payload that both dismisses and categorizes", async () => {
      await expect(() =>
        updateRule({
          data: {
            scope: "vendor",
            externalVendor,
            vendor: null,
            // @ts-expect-error the union forbids this payload; the server rejects it too
            outcome: { type: "dismiss", categoryId: dining },
          },
        }),
      ).rejects.toThrow(/unrecognized_keys/);

      expect(await vendorRule()).toBeNull();
    });
  });

  describe("amount scope", () => {
    const amountRuleWith = async (splits: Array<{ categoryId: string; amount?: number }>) => {
      const rule = await createAmountRule({ externalVendor, amount: -1245 });
      for (const { categoryId, amount } of splits) {
        await createAmountRuleSplit({
          amountRule: { connect: { id: rule.id } },
          category: { connect: { id: categoryId } },
          amount: amount ?? -1245,
        });
      }
      return rule;
    };

    const splitsOf = (id: string) =>
      prisma.amountRuleSplit.findMany({ where: { amountRuleId: id }, orderBy: { amount: "asc" } });

    it("replaces a multi-category split with the single category chosen", async () => {
      const rule = await amountRuleWith([
        { categoryId: dining, amount: -845 },
        { categoryId: fun, amount: -400 },
      ]);

      await updateRule({
        data: {
          scope: "amount",
          id: rule.id,
          outcome: { type: "categorize", splits: [{ categoryId: fun, amount: -1245 }] },
        },
      });

      expect(await splitsOf(rule.id)).toEqual([
        expect.objectContaining({ categoryId: fun, amount: -1245 }),
      ]);
    });

    it("saves a multi-category split", async () => {
      const rule = await amountRuleWith([{ categoryId: dining }]);

      await updateRule({
        data: {
          scope: "amount",
          id: rule.id,
          outcome: {
            type: "categorize",
            splits: [
              { categoryId: dining, amount: -845 },
              { categoryId: fun, amount: -400 },
            ],
          },
        },
      });

      expect(await splitsOf(rule.id)).toHaveLength(2);
    });

    it("rejects splits that do not sum to the rule amount", async () => {
      const rule = await amountRuleWith([{ categoryId: dining }]);

      await expect(
        updateRule({
          data: {
            scope: "amount",
            id: rule.id,
            outcome: { type: "categorize", splits: [{ categoryId: fun, amount: -1 }] },
          },
        }),
      ).rejects.toThrow("Rule splits must sum to the rule amount");
    });

    it("deletes the splits when the rule starts dismissing", async () => {
      const rule = await amountRuleWith([{ categoryId: dining }]);

      await updateRule({ data: { scope: "amount", id: rule.id, outcome: { type: "dismiss" } } });

      expect(await splitsOf(rule.id)).toEqual([]);
    });

    it("gives a dismissing rule a split when a category is set", async () => {
      const rule = await createAmountRule({ externalVendor, amount: -1245 });

      await updateRule({
        data: {
          scope: "amount",
          id: rule.id,
          outcome: { type: "categorize", splits: [{ categoryId: dining, amount: -1245 }] },
        },
      });

      expect(await splitsOf(rule.id)).toEqual([
        expect.objectContaining({ categoryId: dining, amount: -1245 }),
      ]);
    });
  });
});
