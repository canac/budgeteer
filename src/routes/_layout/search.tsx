import {
  Button,
  Grid,
  Group,
  Pagination,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { coerce, enum as enumType, object, optional, string } from "zod/mini";
import { ExternalAccountSelect } from "~/components/ExternalAccountSelect";
import { PageContainer } from "~/components/PageContainer";
import { TransactionList } from "~/components/TransactionList";
import { getCategories } from "~/functions/getCategories";
import { getExternalAccounts } from "~/functions/getExternalAccounts";
import { getVendors } from "~/functions/getVendors";
import { searchTransactions } from "~/functions/searchTransactions";
import { TransactionType } from "~/prisma/enums.ts";

const PAGE_SIZE = 25;

const searchSchema = object({
  from: optional(string()),
  to: optional(string()),
  category: optional(string()),
  vendor: optional(string()),
  type: optional(enumType(TransactionType)),
  account: optional(string()),
  page: optional(coerce.number()),
});

function hasFilter(search: {
  from?: string;
  to?: string;
  category?: string;
  vendor?: string;
  type?: string;
  account?: string;
}) {
  return Object.values(search).some(Boolean);
}

export const Route = createFileRoute("/_layout/search")({
  component: SearchPage,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { from, to, category, vendor, type, account, page } }) => ({
    from,
    to,
    category,
    vendor,
    type,
    account,
    page,
  }),
  loader: async ({ deps: { page, ...filters } }) => {
    const [categories, vendors, accounts] = await Promise.all([
      getCategories(),
      getVendors(),
      getExternalAccounts(),
    ]);
    const { transactions, total } = hasFilter(filters)
      ? await searchTransactions({
          data: {
            fromDate: filters.from,
            toDate: filters.to,
            categoryId: filters.category,
            vendor: filters.vendor,
            type: filters.type,
            accountId: filters.account,
            page,
            pageSize: PAGE_SIZE,
          },
        })
      : { transactions: [], total: 0 };
    return { categories, vendors, accounts, transactions, total };
  },
  head: () => ({ meta: [{ title: "Search | Budgeteer" }] }),
});

function SearchPage() {
  const { categories, vendors, accounts, transactions, total } = Route.useLoaderData();
  const { page, ...filters } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const update = (patch: Partial<typeof filters>) =>
    navigate({
      search: (prev) => {
        // Reset to the first page
        const merged = { ...prev, ...patch, page: undefined };
        return Object.fromEntries(Object.entries(merged).filter(([, value]) => value));
      },
    });

  const clear = () => navigate({ search: {} });

  const handlePageChange = (newPage: number) =>
    navigate({ search: (prev) => ({ ...prev, page: newPage }) });

  const filtered = hasFilter(filters);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
                value={filters.from ?? ""}
                onChange={(event) => update({ from: event.currentTarget.value })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <TextInput
                type="date"
                label="To"
                value={filters.to ?? ""}
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
                value={filters.category ?? null}
                data={categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
                onChange={(value) => update({ category: value ?? undefined })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Select
                label="Vendor"
                placeholder="Any vendor"
                miw={{ md: "16rem" }}
                clearable
                searchable
                value={filters.vendor ?? null}
                data={vendors}
                onChange={(value) => update({ vendor: value ?? undefined })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Select
                label="Type"
                placeholder="Any type"
                clearable
                value={filters.type ?? null}
                data={[
                  { value: TransactionType.TRANSACTION, label: "Transaction" },
                  { value: TransactionType.TRANSFER, label: "Transfer" },
                  { value: TransactionType.BALANCE_ADJUSTMENT, label: "Balance Adjustment" },
                ]}
                onChange={(value) => update({ type: value ?? undefined })}
              />
            </Grid.Col>
            {accounts.length > 0 && (
              <Grid.Col span={{ base: 12, md: 5 }}>
                <ExternalAccountSelect
                  accounts={accounts}
                  value={filters.account ?? null}
                  onChange={(value) => update({ account: value ?? undefined })}
                />
              </Grid.Col>
            )}
          </Grid>

          <Group gap="sm">
            <Text c="dimmed" size="sm">
              {filtered
                ? `${total} transaction${total === 1 ? "" : "s"}`
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
            <Stack>
              <TransactionList transactions={transactions} showCategories />
              {totalPages > 1 && (
                <Group justify="center">
                  <Pagination total={totalPages} value={page} onChange={handlePageChange} />
                </Group>
              )}
            </Stack>
          ))}
      </Stack>
    </PageContainer>
  );
}
