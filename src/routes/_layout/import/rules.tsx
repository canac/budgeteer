import { Stack, Text, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { VendorRules } from "~/lib/ruleLookup";
import { ImportRules } from "~/components/ImportRules";
import { getImportRules } from "~/functions/getImportRules";
import { pluck } from "~/lib/collections";

function matchesSearch(rule: VendorRules, search: string) {
  const query = search.toLowerCase();
  const categoryNames = [rule.vendorRule, ...pluck(rule.amountRules, "outcome")].flatMap(
    (outcome) =>
      outcome?.type === "categorize" ? pluck(pluck(outcome.splits, "category"), "name") : [],
  );
  return [rule.externalVendor, rule.vendorAlias, ...categoryNames].some((field) =>
    field?.toLowerCase().includes(query),
  );
}

export const Route = createFileRoute("/_layout/import/rules")({
  component: ImportRulesPage,
  loader: () => getImportRules(),
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
        <ImportRules rules={filteredRules} />
      )}
    </Stack>
  );
}
