import { createServerFn } from "@tanstack/react-start";
import { discriminatedUnion, literal, strictObject, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = discriminatedUnion("scope", [
  strictObject({ scope: literal("vendor"), externalVendor: string() }),
  strictObject({ scope: literal("amount"), id: string() }),
]);

export const deleteRule = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data }) => {
    if (data.scope === "amount") {
      await prisma.amountRule.delete({ where: { id: data.id } });
      return;
    }

    const where = { externalVendor: data.externalVendor };
    await prisma.$transaction([
      prisma.amountRule.deleteMany({ where }),
      prisma.vendorRule.deleteMany({ where }),
      prisma.vendorAlias.deleteMany({ where }),
    ]);
  });
