import { createServerFn } from "@tanstack/react-start";
import { prisma } from "~/lib/prisma";
import { object, number, string } from "zod";

const inputSchema = object({
  fundId: number(),
  name: string().min(1),
});

export const setFundName = createServerFn()
  .validator((data) => inputSchema.parse(data))
  .handler(async ({ data: { fundId, name } }) => {
    await prisma.fund.update({
      where: { id: fundId },
      data: { name },
    });
  });
