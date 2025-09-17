import { createFileRoute, redirect } from "@tanstack/react-router";
import { monthToString } from "~/lib/monthToString";

export const Route = createFileRoute("/")({
  beforeLoad: () =>
    redirect({
      to: "/budget/$month",
      params: { month: monthToString(new Date()) },
    }),
});
