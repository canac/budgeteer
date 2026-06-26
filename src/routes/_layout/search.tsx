import { Button, Group, Select, Stack, Text, TextInput, Title } from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { object, optional, string } from "zod/mini";
import { PageContainer } from "~/components/PageContainer";
import { TransactionTable } from "~/components/TransactionTable";
import { getCategories } from "~/functions/getCategories";
import { getVendors } from "~/functions/getVendors";
import { searchTransactions } from "~/functions/searchTransactions";

const searchSchema = object({
  from: optional(string()),
  to: optional(string()),
  category: optional(string()),
  vendor: optional(string()),
});

function hasFilter(search: { from?: string; to?: string; category?: string; vendor?: string }) {
  return Object.values(search).some(Boolean);
}

export const Route = createFileRoute("/_layout/search")({
  component: SearchPage,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { from, to, category, vendor } }) => ({ from, to, category, vendor }),
  loader: async ({ deps }) => {
    const [categories, vendors] = await Promise.all([getCategories(), getVendors()]);
    const transactions = hasFilter(deps)
      ? await searchTransactions({
          data: {
            fromDate: deps.from,
            toDate: deps.to,
            categoryId: deps.category,
            vendor: deps.vendor,
          },
        })
      : [];
    return { categories, vendors, transactions };
  },
  head: () => ({ meta: [{ title: "Search | Budgeteer" }] }),
});

function SearchPage() {
  const { categories, vendors, transactions } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const update = (patch: Partial<typeof search>) =>
    navigate({
      search: (prev) => {
        const merged = { ...prev, ...patch };
        return Object.fromEntries(Object.entries(merged).filter(([, value]) => value));
      },
    });

  const clear = () => navigate({ search: {} });

  const filtered = hasFilter(search);

  return (
    <PageContainer>
      <Stack gap="xl">
        <Title order={1}>Search</Title>

        <div>
          <Group align="flex-end" gap="md">
            <TextInput
              type="date"
              label="From"
              flex="1 1 10rem"
              value={search.from ?? ""}
              onChange={(event) => update({ from: event.currentTarget.value })}
            />
            <TextInput
              type="date"
              label="To"
              flex="1 1 10rem"
              value={search.to ?? ""}
              onChange={(event) => update({ to: event.currentTarget.value })}
            />
            <Select
              label="Category"
              placeholder="Any category"
              flex="1 1 10rem"
              clearable
              searchable
              value={search.category ?? null}
              data={categories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
              onChange={(value) => update({ category: value ?? undefined })}
            />
            <Select
              label="Vendor"
              placeholder="Any vendor"
              flex="1 1 10rem"
              clearable
              searchable
              value={search.vendor ?? null}
              data={vendors}
              onChange={(value) => update({ vendor: value ?? undefined })}
            />
          </Group>

          <Group gap="sm">
            <Text c="dimmed" size="sm">
              {filtered
                ? `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`
                : "Set a filter to search"}
            </Text>
            {filtered && (
              <Button variant="subtle" onClick={clear}>
                Clear filters
              </Button>
            )}
          </Group>
        </div>

        {filtered &&
          (transactions.length === 0 ? (
            <Text c="dimmed">No transactions found</Text>
          ) : (
            <TransactionTable transactions={transactions} showCategories />
          ))}
      </Stack>
    </PageContainer>
  );
}
