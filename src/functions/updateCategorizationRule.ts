import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  id: string(),
  vendor: string().min(1),
  categoryId: string().nullable(),
});

export const updateCategorizationRule = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(({ data: { id, ...fields } }) =>
    prisma.categorizationRule.update({ where: { id }, data: fields }),
  );
