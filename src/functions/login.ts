import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { authenticateWithPassword } from "~/lib/auth";

const inputSchema = object({
  password: string().min(1, "Password is required"),
});

export const login = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
    const success = await authenticateWithPassword(data.password);
    if (!success) {
      return { success };
    }

    throw redirect({
      to: "/",
    });
  });
