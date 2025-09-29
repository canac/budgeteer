import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  transactionId: string(),
});

export const deleteTransaction = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { transactionId } }) => {
    await prisma.transaction.delete({
      where: { id: transactionId },
    });
  });
