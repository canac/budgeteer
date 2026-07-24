import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/budget/$month/")({
  beforeLoad: ({ params: { month } }) => {
    throw redirect({ to: "/budget/$month/categories", params: { month }, search: true });
  },
});
