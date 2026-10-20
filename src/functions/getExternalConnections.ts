import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { getPrisma } from "~/lib/prisma";

export const getExternalConnections = createServerFn()
  .middleware([requireAuth])
  .handler(() =>
    getPrisma().externalConnection.findMany({
      orderBy: { institution: "asc" },
      select: { id: true, institution: true, loginRequired: true },
    }),
  );
