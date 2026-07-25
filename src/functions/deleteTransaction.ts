import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  transactionId: string(),
});

export const deleteTransaction = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { transactionId } }) => {
    await prisma.$transaction(async (tx) => {
      const { externalId } = await tx.transaction.delete({
        where: { id: transactionId },
      });

      if (externalId) {
        await tx.externalTransaction.update({
          where: { id: externalId },
          data: { reviewed: false },
        });
      }
    });
  });
