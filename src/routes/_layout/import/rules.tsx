import { createFileRoute } from "@tanstack/react-router";
import { CategorizationRules } from "~/components/CategorizationRules";
import { getCategorizationRules } from "~/functions/getCategorizationRules";

export const Route = createFileRoute("/_layout/import/rules")({
  component: ImportRulesPage,
  loader: () => getCategorizationRules(),
});

function ImportRulesPage() {
  const rules = Route.useLoaderData();
  return <CategorizationRules rules={rules} />;
}
