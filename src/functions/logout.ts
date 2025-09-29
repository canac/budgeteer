import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { clearAuth } from "~/lib/auth";
import { requireAuth } from "~/lib/authMiddleware";

export const logout = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async () => {
    clearAuth();

    throw redirect({
      to: "/login",
    });
  });
