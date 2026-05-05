import { createServerFn } from "@tanstack/react-start";
import { boolean, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  id: string().min(1),
  enabled: boolean(),
});

export const setTellerAccountEnabled = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(({ data: { id, enabled } }) =>
    prisma.tellerAccount.update({ where: { id }, data: { enabled } }),
  );
