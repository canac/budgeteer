import { Button, Grid, Group, Select, Stack, Text, TextInput, Title } from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { object, optional, string } from "zod/mini";
import { ExternalAccountSelect } from "~/components/ExternalAccountSelect";
import { PageContainer } from "~/components/PageContainer";
import { TransactionList } from "~/components/TransactionList";
import { getCategories } from "~/functions/getCategories";
import { getExternalAccounts } from "~/functions/getExternalAccounts";
import { getVendors } from "~/functions/getVendors";
import { searchTransactions } from "~/functions/searchTransactions";

const searchSchema = object({
  from: optional(string()),
  to: optional(string()),
  category: optional(string()),
  vendor: optional(string()),
  account: optional(string()),
});

function hasFilter(search: {
  from?: string;
  to?: string;
  category?: string;
  vendor?: string;
  account?: string;
}) {
  return Object.values(search).some(Boolean);
}

export const Route = createFileRoute("/_layout/search")({
  component: SearchPage,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { from, to, category, vendor, account } }) => ({
    from,
    to,
    category,
    vendor,
    account,
  }),
  loader: async ({ deps }) => {
    const [categories, vendors, accounts] = await Promise.all([
      getCategories(),
      getVendors(),
      getExternalAccounts(),
    ]);
    const transactions = hasFilter(deps)
      ? await searchTransactions({
          data: {
            fromDate: deps.from,
            toDate: deps.to,
            categoryId: deps.category,
            vendor: deps.vendor,
            accountId: deps.account,
          },
        })
      : [];
    return { categories, vendors, accounts, transactions };
  },
  head: () => ({ meta: [{ title: "Search | Budgeteer" }] }),
});

function SearchPage() {
  const { categories, vendors, accounts, transactions } = Route.useLoaderData();
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

        <Stack>
          <Grid>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <TextInput
                type="date"
                label="From"
                value={search.from ?? ""}
                onChange={(event) => update({ from: event.currentTarget.value })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <TextInput
                type="date"
                label="To"
                value={search.to ?? ""}
                onChange={(event) => update({ to: event.currentTarget.value })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Category"
                placeholder="Any category"
                miw={{ md: "16rem" }}
                clearable
                searchable
                value={search.category ?? null}
                data={categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
                onChange={(value) => update({ category: value ?? undefined })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Select
                label="Vendor"
                placeholder="Any vendor"
                miw={{ md: "16rem" }}
                clearable
                searchable
                value={search.vendor ?? null}
                data={vendors}
                onChange={(value) => update({ vendor: value ?? undefined })}
              />
            </Grid.Col>
            {accounts.length > 0 && (
              <Grid.Col span={{ base: 12, md: 7 }}>
                <ExternalAccountSelect
                  accounts={accounts}
                  value={search.account ?? null}
                  onChange={(value) => update({ account: value ?? undefined })}
                />
              </Grid.Col>
            )}
          </Grid>

          <Group gap="sm">
            <Text c="dimmed" size="sm">
              {filtered
                ? `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`
                : "Set a filter to search"}
            </Text>
            <Button variant="subtle" onClick={clear} display={filtered ? "visible" : "none"}>
              Clear filters
            </Button>
          </Group>
        </Stack>

        {filtered &&
          (transactions.length === 0 ? (
            <Text c="dimmed">No transactions found</Text>
          ) : (
            <TransactionList transactions={transactions} showCategories />
          ))}
      </Stack>
    </PageContainer>
  );
}
