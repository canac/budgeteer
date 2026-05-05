import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  enrollmentId: string().min(1),
  accessToken: string().min(1),
});

export const createTellerEnrollment = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(({ data: { enrollmentId, accessToken } }) =>
    prisma.tellerEnrollment.upsert({
      where: { id: enrollmentId },
      create: { id: enrollmentId, accessToken },
      update: { accessToken },
    }),
  );
