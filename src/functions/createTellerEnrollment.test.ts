import { createTellerEnrollment as seedTellerEnrollment } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { createTellerEnrollment } from "./createTellerEnrollment.ts";

describe("createTellerEnrollment", () => {
  const prisma = getPrisma();

  it("inserts an enrollment", async () => {
    await createTellerEnrollment({
      data: { enrollmentId: "enr_new", accessToken: "token_1" },
    });

    const enrollment = await prisma.tellerEnrollment.findUniqueOrThrow({
      where: { id: "enr_new" },
    });
    expect(enrollment.accessToken).toBe("token_1");
  });

  it("updates an existing enrollment", async () => {
    const existing = await seedTellerEnrollment({ accessToken: "old_token" });

    await createTellerEnrollment({
      data: { enrollmentId: existing.id, accessToken: "new_token" },
    });

    const enrollment = await prisma.tellerEnrollment.findUniqueOrThrow({
      where: { id: existing.id },
    });
    expect(enrollment.accessToken).toBe("new_token");
  });
});
