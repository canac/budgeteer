import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = object({ id: string() });

export const acknowledgeTransactionChange = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { id } }) => {
    await prisma.externalTransaction.update({
      where: { id },
      data: { changedAt: null },
    });
  });
