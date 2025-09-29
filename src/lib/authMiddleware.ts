import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { isAuthenticated } from "./auth";

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  if (await isAuthenticated()) {
    return next();
  }

  throw redirect({
    to: "/login",
  });
});
