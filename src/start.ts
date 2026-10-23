import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { withRequestPrisma } from "./lib/prisma.ts";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const prismaMiddleware = createMiddleware().server(({ next }) =>
  withRequestPrisma(env.HYPERDRIVE.connectionString, next),
);

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, prismaMiddleware],
}));
