import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { PlaidClient } from "~/lib/plaid/client";
import { refreshAccounts } from "~/lib/plaid/sync";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  publicToken: string().min(1),
  institution: string().min(1),
});

export const exchangePublicToken = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { publicToken, institution } }) => {
    const client = new PlaidClient();
    const { accessToken, itemId } = await client.exchangePublicToken(publicToken);

    const connection = await prisma.externalConnection.upsert({
      where: { id: itemId },
      create: { id: itemId, accessToken, institution },
      update: { accessToken, institution, loginRequired: false },
    });

    await refreshAccounts(client, { ...connection, accounts: [] });
  });
