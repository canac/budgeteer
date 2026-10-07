import { createServerFn } from "@tanstack/react-start";
import { array, boolean, discriminatedUnion, int, literal, number, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";
import { ruleScopeSchema, saveRule } from "~/lib/saveRule";

const inputSchema = object({
  id: string(),
  ruleScope: ruleScopeSchema.default("none"),
  decision: discriminatedUnion("type", [
    object({
      type: literal("accept"),
      vendor: string().min(1),
      description: string().optional(),
      updateAlias: boolean(),
      splits: array(
        object({
          categoryId: string(),
          amount: number().check(int()),
        }),
      ).min(1),
    }),
    object({ type: literal("dismiss") }),
  ]),
});

export const reviewTransaction = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { id, ruleScope, decision } }) => {
    const externalTransaction = await prisma.externalTransaction.findUniqueOrThrow({
      where: { id },
    });
    const accept = decision.type === "accept" ? decision : null;

    if (
      accept &&
      accept.splits.reduce((sum, split) => sum + split.amount, 0) !== externalTransaction.amount
    ) {
      throw new Error("This transaction changed at the bank");
    }

    return prisma.$transaction(async (tx) => {
      await saveRule({
        tx,
        externalTransaction,
        newVendorAlias: accept?.updateAlias ? accept.vendor : null,
        scope: ruleScope,
        splits: accept?.splits ?? [],
      });

      const [transaction] = await Promise.all([
        accept &&
          tx.transaction.create({
            data: {
              type: "TRANSACTION",
              amount: externalTransaction.amount,
              date: externalTransaction.date,
              vendor: accept.vendor,
              description: accept.description,
              externalId: externalTransaction.id,
              transactionCategories: { create: accept.splits },
            },
          }),
        tx.externalTransaction.update({
          where: { id },
          data: { reviewed: true },
        }),
      ]);
      return transaction;
    });
  });
