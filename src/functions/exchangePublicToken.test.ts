import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { server } from "../../test/mswServer.ts";
import { exchangePublicToken } from "./exchangePublicToken.ts";

const PLAID_ORIGIN = "https://sandbox.plaid.com";

describe("exchangePublicToken", () => {
  const prisma = getPrisma();

  function mockPlaid(accounts: { account_id: string; name: string; type: string }[]) {
    server.use(
      http.post(`${PLAID_ORIGIN}/item/public_token/exchange`, () =>
        HttpResponse.json({ access_token: "access-1", item_id: "item-1", request_id: "r" }),
      ),
      http.post(`${PLAID_ORIGIN}/accounts/get`, () =>
        HttpResponse.json({ accounts, item: {}, request_id: "r" }),
      ),
    );
  }

  it("stores the connection and its accounts", async () => {
    mockPlaid([
      { account_id: "acc_1", name: "Checking", type: "depository" },
      { account_id: "acc_2", name: "Card", type: "credit" },
    ]);

    await exchangePublicToken({ data: { publicToken: "public-1", institution: "Capital One" } });

    const connection = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: "item-1" },
      include: { accounts: { orderBy: { id: "asc" } } },
    });
    expect(connection.accessToken).toBe("access-1");
    expect(connection.institution).toBe("Capital One");
    expect(connection.accounts.map((account) => [account.id, account.creditCard])).toEqual([
      ["acc_1", false],
      ["acc_2", true],
    ]);
  });

  it("updates the access token when re-enrolling the same item", async () => {
    mockPlaid([{ account_id: "acc_1", name: "Checking", type: "depository" }]);
    await exchangePublicToken({ data: { publicToken: "public-1", institution: "Citi" } });

    server.use(
      http.post(`${PLAID_ORIGIN}/item/public_token/exchange`, () =>
        HttpResponse.json({ access_token: "access-2", item_id: "item-1", request_id: "r" }),
      ),
      http.post(`${PLAID_ORIGIN}/accounts/get`, () =>
        HttpResponse.json({ accounts: [], item: {}, request_id: "r" }),
      ),
    );
    await exchangePublicToken({ data: { publicToken: "public-2", institution: "Citi" } });

    const connection = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: "item-1" },
    });
    expect(connection.accessToken).toBe("access-2");
    expect(await prisma.externalConnection.count()).toBe(1);
  });
});
