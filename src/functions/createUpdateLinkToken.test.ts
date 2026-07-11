import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { createExternalConnection } from "../../test/mocks.ts";
import { server } from "../../test/mswServer.ts";
import { createUpdateLinkToken } from "./createUpdateLinkToken.ts";

interface LinkTokenRequest {
  access_token?: string;
  products?: string[];
}

describe("createUpdateLinkToken", () => {
  it("creates an update-mode link token for the connection's access token", async () => {
    const connection = await createExternalConnection({ accessToken: "access-abc" });
    let captured: LinkTokenRequest | undefined;
    server.use(
      http.post<never, LinkTokenRequest>(
        "https://sandbox.plaid.com/link/token/create",
        async ({ request }) => {
          captured = await request.json();
          return HttpResponse.json({ link_token: "link-update-1", request_id: "r" });
        },
      ),
    );

    const result = await createUpdateLinkToken({ data: { connectionId: connection.id } });

    expect(result).toEqual({ linkToken: "link-update-1" });
    expect(captured).toMatchObject({ access_token: "access-abc" });
    expect(captured).not.toHaveProperty("products");
  });
});
