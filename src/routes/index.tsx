import { createFileRoute, redirect } from "@tanstack/react-router";
import { toISOMonthString } from "~/lib/month";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({
      to: "/budget/$month",
      params: { month: toISOMonthString(new Date()) },
    });
  },
});
