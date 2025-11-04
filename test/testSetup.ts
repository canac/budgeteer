import { afterAll, beforeEach, vi } from "vitest";
import { ZodType } from "zod";
import { disconnectPrisma, getPrisma, resetDatabase } from "./helpers";

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
        (handlerFn: (ctx: unknown) => Promise<unknown>) =>
        ({ data }: { data: unknown }) =>
          handlerFn({
            data: validator ? validator.parse(data) : data,
          }),
    };
    return builder;
  },
}));

vi.mock("~/lib/prisma", () => ({
  prisma: getPrisma(),
}));

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await disconnectPrisma();
});
