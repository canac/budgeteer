import { createServerFn } from "@tanstack/react-start";
import { subMonths } from "date-fns";
import { number, object, optional } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { pluck } from "~/lib/collections";
import { toISODateString } from "~/lib/iso";
import { prisma } from "~/lib/prisma";

const inputSchema = optional(
  object({
    months: optional(number()),
  }),
);

export const getVendors = createServerFn()
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data }) => {
    const months = data?.months;
    const vendors = await prisma.transaction.findMany({
      where: {
        date:
          months === undefined
            ? undefined
            : { gte: toISODateString(subMonths(new Date(), months)) },
        type: "TRANSACTION",
      },
      select: {
        vendor: true,
      },
      distinct: ["vendor"],
      orderBy: {
        vendor: "asc",
      },
    });
    return pluck(vendors, "vendor");
  });
