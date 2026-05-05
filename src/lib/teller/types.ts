import z, { array, literal, object, string, union } from "zod";

export const tellerAccountSchema = object({
  id: string(),
  name: string(),
  type: string(),
  institution: object({
    name: string(),
  }),
});
export const tellerAccountsSchema = array(tellerAccountSchema);

export const tellerTransactionSchema = object({
  id: string(),
  amount: string(),
  date: string(),
  status: union([literal("pending"), literal("posted")]),
  description: string(),
  details: object({
    counterparty: object({
      name: string(),
    }).nullish(),
  }),
});
export const tellerTransactionsSchema = array(tellerTransactionSchema);

export type TellerApiAccount = z.infer<typeof tellerAccountSchema>;
export type TellerApiTransaction = z.infer<typeof tellerTransactionSchema>;
