import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { getPrisma } from "~/lib/prisma";

const inputSchema = object({ connectionId: string() });

export const markConnectionReconnected = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { connectionId } }) => {
    await getPrisma().externalConnection.update({
      where: { id: connectionId },
      data: { loginRequired: false },
    });
  });
