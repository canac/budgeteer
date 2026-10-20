import { endOfMonth, startOfMonth } from "date-fns";
import type { Prisma } from "~/prisma/client";
import { toISODateString } from "~/lib/iso";

export function leftoversTransferWhere(
  month: Date,
  transfer: Prisma.TransferWhereInput = {},
): Prisma.TransactionWhereInput {
  return {
    type: "TRANSFER",
    date: {
      gte: toISODateString(startOfMonth(month)),
      lte: toISODateString(endOfMonth(month)),
    },
    transfer: { ...transfer, sourceCategoryId: null },
  };
}
