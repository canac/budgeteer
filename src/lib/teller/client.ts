import type { ZodType } from "zod";
import { subDays } from "date-fns";
import { Agent, fetch, type Dispatcher } from "undici";
import { toISODateString } from "../iso";
import {
  tellerAccountsSchema,
  tellerTransactionsSchema,
  type TellerApiAccount,
  type TellerApiTransaction,
} from "./types";

const BASE_URL = "https://api.teller.io";

function createAgent(): Agent {
  const cert = process.env.TELLER_CERT;
  const key = process.env.TELLER_KEY;
  if (!cert || !key) {
    throw new Error("TELLER_CERT and TELLER_KEY must be set");
  }

  return new Agent({
    connect: { cert, key },
  });
}

let dispatcher: Dispatcher | null = null;
function getDispatcher(): Dispatcher {
  dispatcher ??= createAgent();
  return dispatcher;
}

export function setDispatcher(newDispatcher: Dispatcher | null): void {
  dispatcher = newDispatcher;
}

export class TellerClient {
  readonly #accessToken: string;

  constructor(accessToken: string) {
    this.#accessToken = accessToken;
  }

  async #get<T>(path: string, schema: ZodType<T>): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.#accessToken}:`).toString("base64")}`,
        Accept: "application/json",
      },
      dispatcher: getDispatcher(),
    });
    if (!res.ok) {
      throw new Error(`GET ${url} returned ${res.status}`);
    }
    return schema.parse(await res.json());
  }

  listAccounts(): Promise<TellerApiAccount[]> {
    return this.#get("/accounts", tellerAccountsSchema);
  }

  async *listTransactions(accountId: string, lastSync: Date): AsyncGenerator<TellerApiTransaction> {
    const BATCH_SIZE = 100;

    const startDate = toISODateString(subDays(lastSync, 10));
    let fromId = null;
    // oxlint-disable-next-line typescript/no-unnecessary-condition
    while (true) {
      const params = new URLSearchParams({
        count: String(BATCH_SIZE),
        start_date: startDate,
      });
      if (fromId) {
        params.set("from_id", fromId);
      }

      const batch = await this.#get(
        `/accounts/${accountId}/transactions?${params.toString()}`,
        tellerTransactionsSchema,
      );
      yield* batch;

      if (batch.length < BATCH_SIZE) {
        return;
      }
      fromId = batch.at(-1)?.id;
    }
  }
}
