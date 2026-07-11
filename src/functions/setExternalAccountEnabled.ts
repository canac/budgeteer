import { createServerFn } from "@tanstack/react-start";
import { boolean, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  id: string().min(1),
  enabled: boolean(),
});

export const setExternalAccountEnabled = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { id, enabled } }) => {
    const account = await prisma.externalAccount.update({ where: { id }, data: { enabled } });
    if (enabled) {
      // Reset the connection cursor so the next import re-fetches full history
      await prisma.externalConnection.update({
        where: { id: account.connectionId },
        data: { cursor: null },
      });
    }
    return account;
  });
