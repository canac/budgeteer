import { createServerFn } from "@tanstack/react-start";
import { boolean, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { getPrisma } from "~/lib/prisma";

const inputSchema = object({
  id: string().min(1),
  archived: boolean(),
});

export const setExternalAccountArchived = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(({ data: { id, archived } }) =>
    getPrisma().externalAccount.update({
      where: { id },
      data: archived ? { archived, enabled: false } : { archived },
    }),
  );
