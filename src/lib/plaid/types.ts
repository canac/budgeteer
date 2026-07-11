import type z from "zod";
import { array, boolean, number, object, string } from "zod";

export const plaidAccountSchema = object({
  account_id: string(),
  name: string(),
  type: string(),
});
export const plaidAccountsSchema = array(plaidAccountSchema);

export const plaidTransactionSchema = object({
  transaction_id: string(),
  account_id: string(),
  amount: number(),
  date: string(),
  name: string(),
  merchant_name: string().nullish(),
  pending: boolean(),
});

export const plaidRemovedTransactionSchema = object({ transaction_id: string() });

export const plaidErrorSchema = object({ error_code: string().nullish() });

export const linkTokenResponseSchema = object({ link_token: string() });

export const exchangeResponseSchema = object({
  access_token: string(),
  item_id: string(),
});

export const accountsResponseSchema = object({ accounts: plaidAccountsSchema });

export const syncResponseSchema = object({
  added: array(plaidTransactionSchema),
  modified: array(plaidTransactionSchema),
  removed: array(plaidRemovedTransactionSchema),
  next_cursor: string(),
  has_more: boolean(),
});

export type PlaidAccount = z.infer<typeof plaidAccountSchema>;
export type PlaidTransaction = z.infer<typeof plaidTransactionSchema>;
export type PlaidSyncPage = z.infer<typeof syncResponseSchema>;
