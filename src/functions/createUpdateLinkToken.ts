import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { PlaidClient } from "~/lib/plaid/client";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  connectionId: string(),
});

export const createUpdateLinkToken = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { connectionId } }) => {
    const connection = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: connectionId },
    });
    return new PlaidClient().createLinkToken(connection.accessToken);
  });
