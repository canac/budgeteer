import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { PlaidClient } from "~/lib/plaid/client";
import { getPrisma } from "~/lib/prisma";

const inputSchema = object({
  connectionId: string(),
});

export const createUpdateLinkToken = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { connectionId } }) => {
    const connection = await getPrisma().externalConnection.findUniqueOrThrow({
      where: { id: connectionId },
    });
    return new PlaidClient().createLinkToken(connection.accessToken);
  });
