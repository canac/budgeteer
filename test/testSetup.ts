import { afterAll, beforeAll, beforeEach, vi } from "vitest";
import { ZodType } from "zod";
import { disconnectPrisma, getPrisma, resetDatabase, setupSchema } from "./helpers";

vi.mock("@tanstack/react-start", async (importOriginal) => ({
  ...(await importOriginal()),
  createServerFn: () => {
    let validator: ZodType | null = null;
    const builder = {
      inputValidator: (v: unknown) => {
        validator = v instanceof ZodType ? v : null;
        return builder;
      },
      middleware: () => builder,
      handler:
        (handlerFn: (ctx: unknown) => Promise<unknown>) => async (args?: { data?: unknown }) =>
          handlerFn({
            data: validator ? await validator.parseAsync(args?.data) : args?.data,
          }),
    };
    return builder;
  },
}));

vi.mock("~/lib/prisma", () => ({
  prisma: getPrisma(),
}));

beforeAll(async () => {
  await setupSchema();
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await disconnectPrisma();
});
