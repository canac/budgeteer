import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../test/mswServer.ts";
import { PlaidClient } from "./client.ts";

const PLAID_ORIGIN = "https://sandbox.plaid.com";

interface PlaidRequestBody {
  client_id?: string;
  secret?: string;
  products?: string[];
  country_codes?: string[];
  user?: { client_user_id: string };
  public_token?: string;
  access_token?: string;
  cursor?: string;
  transactions?: { days_requested?: number };
}

describe("PlaidClient", () => {
  const client = new PlaidClient();

  it("createLinkToken sends credentials and returns the link token", async () => {
    let captured: PlaidRequestBody | undefined;
    server.use(
      http.post<never, PlaidRequestBody>(
        `${PLAID_ORIGIN}/link/token/create`,
        async ({ request }) => {
          captured = await request.json();
          return HttpResponse.json({ link_token: "link-sandbox-abc", request_id: "r" });
        },
      ),
    );

    const result = await client.createLinkToken();

    expect(result).toEqual({ linkToken: "link-sandbox-abc" });
    expect(captured).toMatchObject({
      client_id: "test_client_id",
      secret: "test_secret",
      products: ["transactions"],
      country_codes: ["US"],
      transactions: { days_requested: 730 },
    });
    expect(typeof captured?.user?.client_user_id).toBe("string");
  });

  it("exchangePublicToken returns access token and item id", async () => {
    let captured: PlaidRequestBody | undefined;
    server.use(
      http.post<never, PlaidRequestBody>(
        `${PLAID_ORIGIN}/item/public_token/exchange`,
        async ({ request }) => {
          captured = await request.json();
          return HttpResponse.json({
            access_token: "access-sandbox-1",
            item_id: "item-1",
            request_id: "r",
          });
        },
      ),
    );

    const result = await client.exchangePublicToken("public-sandbox-1");

    expect(result).toEqual({ accessToken: "access-sandbox-1", itemId: "item-1" });
    expect(captured).toMatchObject({ public_token: "public-sandbox-1" });
  });

  it("getAccounts returns parsed accounts", async () => {
    server.use(
      http.post(`${PLAID_ORIGIN}/accounts/get`, () =>
        HttpResponse.json({
          accounts: [
            { account_id: "acc_1", name: "Checking", type: "depository", subtype: "checking" },
            { account_id: "acc_2", name: "Card", type: "credit", subtype: "credit card" },
          ],
          item: {},
          request_id: "r",
        }),
      ),
    );

    const accounts = await client.getAccounts("access-sandbox-1");

    expect(accounts.map((account) => [account.account_id, account.type])).toEqual([
      ["acc_1", "depository"],
      ["acc_2", "credit"],
    ]);
  });

  it("syncTransactions sends the cursor and returns the page", async () => {
    let captured: PlaidRequestBody | undefined;
    server.use(
      http.post<never, PlaidRequestBody>(
        `${PLAID_ORIGIN}/transactions/sync`,
        async ({ request }) => {
          captured = await request.json();
          return HttpResponse.json({
            added: [
              {
                transaction_id: "t1",
                account_id: "acc_1",
                amount: 12.34,
                date: "2026-04-15",
                name: "COFFEE",
                merchant_name: "Coffee",
                pending: false,
              },
            ],
            modified: [],
            removed: [{ transaction_id: "t0" }],
            next_cursor: "cursor-2",
            has_more: false,
            request_id: "r",
          });
        },
      ),
    );

    const page = await client.syncTransactions("access-sandbox-1", "cursor-1");

    expect(captured).toMatchObject({ access_token: "access-sandbox-1", cursor: "cursor-1" });
    expect(page.next_cursor).toBe("cursor-2");
    expect(page.has_more).toBe(false);
    expect(page.added[0]?.transaction_id).toBe("t1");
    expect(page.removed[0]?.transaction_id).toBe("t0");
  });

  it("omits the cursor on the initial sync", async () => {
    let captured: PlaidRequestBody | undefined;
    server.use(
      http.post<never, PlaidRequestBody>(
        `${PLAID_ORIGIN}/transactions/sync`,
        async ({ request }) => {
          captured = await request.json();
          return HttpResponse.json({
            added: [],
            modified: [],
            removed: [],
            next_cursor: "cursor-1",
            has_more: false,
            request_id: "r",
          });
        },
      ),
    );

    await client.syncTransactions("access-sandbox-1", null);

    expect(captured).not.toHaveProperty("cursor");
  });

  it("throws a PlaidError carrying the Plaid error code on failure", async () => {
    server.use(
      http.post(`${PLAID_ORIGIN}/accounts/get`, () =>
        HttpResponse.json(
          {
            error_type: "ITEM_ERROR",
            error_code: "ITEM_LOGIN_REQUIRED",
            error_message: "the login details of this item have changed",
          },
          { status: 400 },
        ),
      ),
    );

    await expect(client.getAccounts("bad")).rejects.toMatchObject({
      name: "PlaidError",
      errorCode: "ITEM_LOGIN_REQUIRED",
    });
  });

  it("createLinkToken uses update mode when given a token", async () => {
    let captured: PlaidRequestBody | undefined;
    server.use(
      http.post<never, PlaidRequestBody>(
        `${PLAID_ORIGIN}/link/token/create`,
        async ({ request }) => {
          captured = await request.json();
          return HttpResponse.json({ link_token: "link-update", request_id: "r" });
        },
      ),
    );

    const result = await client.createLinkToken("access-existing");

    expect(result).toEqual({ linkToken: "link-update" });
    expect(captured).toMatchObject({
      access_token: "access-existing",
      transactions: { days_requested: 730 },
    });
    expect(captured).not.toHaveProperty("products");
  });
});
