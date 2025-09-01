import { createServerFn } from "@tanstack/react-start";
import { number, object } from "zod";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  transactionId: number(),
});

export const deleteTransaction = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data: { transactionId } }) => {
    await prisma.transaction.delete({
      where: { id: transactionId },
    });
  });
