import { createServerFn } from "@tanstack/react-start";
import { array, boolean, number, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const overrideSchema = object({
  vendor: string().min(1),
  categories: array(
    object({
      categoryId: string(),
      amount: number().int(),
    }),
  ),
  updateRuleVendor: boolean(),
  updateRuleCategory: boolean(),
}).refine((value) => !value.updateRuleCategory || value.categories.length === 1, {
  error: "Can only update rule when exactly one category is selected",
  path: ["updateRuleCategory"],
});

const inputSchema = object({
  id: string(),
  override: overrideSchema.optional(),
});

export const acceptTransaction = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { id, override } }) => {
    const tellerTransaction = await prisma.tellerTransaction.findUniqueOrThrow({
      where: { id },
    });
    const rule = await prisma.categorizationRule.findUnique({
      where: { tellerVendor: tellerTransaction.vendor },
    });

    const vendor = override?.vendor ?? rule?.vendor ?? tellerTransaction.vendor;
    const categories =
      override?.categories ??
      (rule?.categoryId ? [{ categoryId: rule.categoryId, amount: tellerTransaction.amount }] : []);

    if (override) {
      const total = categories.reduce((sum, category) => sum + category.amount, 0);
      if (total !== tellerTransaction.amount) {
        throw new Error("Category amounts must sum to transaction amount");
      }
    }

    return prisma.$transaction(async (tx) => {
      const [transaction] = await Promise.all([
        tx.transaction.create({
          data: {
            type: "TRANSACTION",
            amount: tellerTransaction.amount,
            date: tellerTransaction.date,
            vendor,
            tellerId: tellerTransaction.id,
            transactionCategories: {
              create: categories.map(({ categoryId, amount }) => ({ categoryId, amount })),
            },
          },
        }),
        tx.tellerTransaction.update({
          where: { id },
          data: { reviewed: true },
        }),
        override?.updateRuleVendor || override?.updateRuleCategory
          ? tx.categorizationRule.upsert({
              where: { tellerVendor: tellerTransaction.vendor },
              create: {
                tellerVendor: tellerTransaction.vendor,
                vendor: override.vendor,
                categoryId: override.updateRuleCategory ? override.categories[0].categoryId : null,
              },
              update: {
                ...(override.updateRuleVendor ? { vendor: override.vendor } : {}),
                ...(override.updateRuleCategory
                  ? { categoryId: override.categories[0].categoryId }
                  : {}),
              },
            })
          : null,
      ]);
      return transaction;
    });
  });
