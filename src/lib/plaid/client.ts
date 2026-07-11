import type { ZodType } from "zod";
import {
  accountsResponseSchema,
  exchangeResponseSchema,
  linkTokenResponseSchema,
  plaidErrorSchema,
  syncResponseSchema,
  type PlaidAccount,
  type PlaidSyncPage,
} from "./types";

export class PlaidError extends Error {
  readonly status: number;
  readonly errorCode: string | null;

  constructor(status: number, errorCode: string | null) {
    super(`Plaid request failed (${status}${errorCode ? `: ${errorCode}` : ""})`);
    this.name = "PlaidError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

function baseUrl(): string {
  const env = process.env.PLAID_ENV ?? "sandbox";
  return `https://${env}.plaid.com`;
}

function credentials(): { client_id: string; secret: string } {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) {
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET must be set");
  }
  return { client_id: clientId, secret };
}

export class PlaidClient {
  async #post<T>(path: string, body: Record<string, unknown>, schema: ZodType<T>): Promise<T> {
    const res = await fetch(`${baseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...credentials(), ...body }),
    });
    if (!res.ok) {
      const parsed = plaidErrorSchema.safeParse(await res.json().catch(() => null));
      throw new PlaidError(res.status, parsed.success ? (parsed.data.error_code ?? null) : null);
    }
    return schema.parse(await res.json());
  }

  /**
   * Create a Plaid link token.
   *
   * @param accessToken - Pass to create an update-mode link token (reauthenticate an existing Item); omit for a normal
   * new-enrollment link token.
   */
  async createLinkToken(accessToken?: string): Promise<{ linkToken: string }> {
    const { link_token } = await this.#post(
      "/link/token/create",
      {
        client_name: "Budgeteer",
        language: "en",
        country_codes: ["US"],
        user: { client_user_id: "budgeteer" },
        transactions: { days_requested: 730 }, // maximum allowed
        ...(accessToken ? { access_token: accessToken } : { products: ["transactions"] }),
      },
      linkTokenResponseSchema,
    );
    return { linkToken: link_token };
  }

  async exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string }> {
    const { access_token, item_id } = await this.#post(
      "/item/public_token/exchange",
      { public_token: publicToken },
      exchangeResponseSchema,
    );
    return { accessToken: access_token, itemId: item_id };
  }

  async getAccounts(accessToken: string): Promise<PlaidAccount[]> {
    const { accounts } = await this.#post(
      "/accounts/get",
      { access_token: accessToken },
      accountsResponseSchema,
    );
    return accounts;
  }

  syncTransactions(accessToken: string, cursor: string | null): Promise<PlaidSyncPage> {
    return this.#post(
      "/transactions/sync",
      { access_token: accessToken, ...(cursor ? { cursor } : {}) },
      syncResponseSchema,
    );
  }
}
