import { createServerFn } from "@tanstack/react-start";
import { subMonths } from "date-fns";
import { requireAuth } from "~/lib/authMiddleware";
import { pluck } from "~/lib/collections";
import { toISODateString } from "~/lib/iso";
import { prisma } from "~/lib/prisma";

export const getVendors = createServerFn()
  .middleware([requireAuth])
  .handler(async () => {
    const vendors = await prisma.transaction.findMany({
      where: {
        date: { gte: toISODateString(subMonths(new Date(), 3)) },
        transfer: null,
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
