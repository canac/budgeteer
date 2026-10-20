import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { getPrisma } from "~/lib/prisma";

const inputSchema = object({ id: string() });

export const acknowledgeTransactionChange = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { id } }) => {
    await getPrisma().externalTransaction.update({
      where: { id },
      data: { changedAt: null },
    });
  });
