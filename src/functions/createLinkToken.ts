import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { PlaidClient } from "~/lib/plaid/client";

export const createLinkToken = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(() => new PlaidClient().createLinkToken());
