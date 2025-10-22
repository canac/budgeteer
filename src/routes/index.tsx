import { createFileRoute, redirect } from "@tanstack/react-router";
import { serializeISO } from "~/lib/month";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({
      to: "/budget/$month",
      params: { month: serializeISO(new Date()) },
    });
  },
});
