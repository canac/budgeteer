import { createServerFn } from "@tanstack/react-start";
import { subMonths } from "date-fns";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

export const getVendors = createServerFn()
  .middleware([requireAuth])
  .handler(async () => {
    const vendors = await prisma.transaction.findMany({
      where: {
        date: { gte: subMonths(new Date(), 3) },
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
    return vendors.map((transaction) => transaction.vendor);
  });
