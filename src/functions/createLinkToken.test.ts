import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../test/mswServer.ts";
import { createLinkToken } from "./createLinkToken.ts";

describe("createLinkToken", () => {
  it("returns a link token from Plaid", async () => {
    server.use(
      http.post("https://sandbox.plaid.com/link/token/create", () =>
        HttpResponse.json({ link_token: "link-sandbox-xyz", request_id: "r" }),
      ),
    );

    expect(await createLinkToken()).toEqual({ linkToken: "link-sandbox-xyz" });
  });
});
