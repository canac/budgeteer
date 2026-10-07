import { createServerFn } from "@tanstack/react-start";
import { array, discriminatedUnion, int, literal, number, strictObject, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";
import {
  assertRuleSplits,
  writeAlias,
  writeAmountRuleSplits,
  writeVendorRule,
} from "~/lib/saveRule";

const vendorOutcomeSchema = discriminatedUnion("type", [
  strictObject({ type: literal("none") }),
  strictObject({ type: literal("categorize"), categoryId: string() }),
  strictObject({ type: literal("dismiss") }),
]);

const amountOutcomeSchema = discriminatedUnion("type", [
  strictObject({
    type: literal("categorize"),
    splits: array(strictObject({ categoryId: string(), amount: number().check(int()) })).min(1),
  }),
  strictObject({ type: literal("dismiss") }),
]);

const inputSchema = discriminatedUnion("scope", [
  strictObject({
    scope: literal("vendor"),
    externalVendor: string(),
    vendor: string().min(1).nullable(),
    outcome: vendorOutcomeSchema,
  }),
  strictObject({
    scope: literal("amount"),
    id: string(),
    outcome: amountOutcomeSchema,
  }),
]);

export const updateRule = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data }) => {
    if (data.scope === "vendor") {
      const { externalVendor, outcome } = data;
      await prisma.$transaction(async (tx) => {
        await writeAlias(tx, externalVendor, data.vendor);
        if (outcome.type === "none") {
          await tx.vendorRule.deleteMany({ where: { externalVendor } });
        } else {
          await writeVendorRule(
            tx,
            externalVendor,
            outcome.type === "categorize" ? outcome.categoryId : null,
          );
        }
      });
      return;
    }

    const { id, outcome } = data;
    const splits = outcome.type === "categorize" ? outcome.splits : [];
    const amountRule = await prisma.amountRule.findUniqueOrThrow({ where: { id } });
    assertRuleSplits(splits, amountRule.amount);
    await prisma.$transaction((tx) => writeAmountRuleSplits(tx, id, splits));
  });
