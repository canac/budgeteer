import { Stack, Text, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CategorizationRules, type Rule } from "~/components/CategorizationRules";
import { getCategorizationRules } from "~/functions/getCategorizationRules";

function matchesSearch(rule: Rule, search: string) {
  const query = search.toLowerCase();
  return [rule.externalVendor, rule.vendor, rule.category?.name].some((field) =>
    field?.toLowerCase().includes(query),
  );
}

export const Route = createFileRoute("/_layout/import/rules")({
  component: ImportRulesPage,
  loader: () => getCategorizationRules(),
  head: () => ({ meta: [{ title: "Rules | Budgeteer" }] }),
});

function ImportRulesPage() {
  const rules = Route.useLoaderData();
  const [search, setSearch] = useState("");

  const filteredRules = search ? rules.filter((rule) => matchesSearch(rule, search)) : rules;

  return (
    <Stack>
      <TextInput
        placeholder="Search rules"
        aria-label="Search rules"
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />
      {filteredRules.length === 0 ? (
        <Text c="dimmed">{rules.length === 0 ? "No rules yet" : "No rules found"}</Text>
      ) : (
        <CategorizationRules rules={filteredRules} />
      )}
    </Stack>
  );
}
