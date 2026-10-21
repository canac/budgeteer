import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { importAllTransactions } from "~/lib/plaid/importAll";

export const importTransactions = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(() => importAllTransactions());
