import { Button, Card, Group, SimpleGrid, Stack, Switch, Text, Title } from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { parseISO, subMonths } from "date-fns";
import { _default, coerce, enum as enumType, object } from "zod/mini";
import { CategoryHistoryChart } from "~/components/CategoryHistoryChart";
import { CategoryType } from "~/components/CategoryType";
import { CategoryTypeIcons } from "~/components/CategoryTypeIcons";
import { PageContainer } from "~/components/PageContainer";
import { TransactionTable } from "~/components/TransactionTable";
import { getCategoryHistory } from "~/functions/getCategoryHistory";
import { formatCurrency, monthFormatter } from "~/lib/formatters";
import { toISOMonthString } from "~/lib/iso";

const ranges = ["current", "last1", "last3", "last6", "last12"] as const;
type Range = (typeof ranges)[number];

const searchSchema = object({
  range: _default(enumType(ranges), "current"),
  transfers: _default(coerce.boolean(), false),
});

function getRangeMonths(range: Range) {
  const currentDate = new Date();
  if (range === "current") {
    const month = toISOMonthString(currentDate);
    return { startMonth: month, endMonth: month };
  }
  const count = Number(range.slice(4));
  return {
    startMonth: toISOMonthString(subMonths(currentDate, count)),
    endMonth: toISOMonthString(subMonths(currentDate, 1)),
  };
}

export const Route = createFileRoute("/_layout/category/$category")({
  component: CategoryHistoryPage,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { range, transfers } }) => ({
    range,
    transfers,
  }),
  loader: ({ params: { category }, deps: { range, transfers } }) => {
    const { startMonth, endMonth } = getRangeMonths(range);
    return getCategoryHistory({
      data: {
        categoryId: category,
        startMonth,
        endMonth,
        includeTransfers: transfers,
      },
    });
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.category.name ?? "Category"} | Budgeteer` }],
  }),
});

const rangeOptions: Array<{ value: Range; label: string }> = [
  { value: "current", label: "This month" },
  { value: "last1", label: "Last month" },
  { value: "last3", label: "Last 3 months" },
  { value: "last6", label: "Last 6 months" },
  { value: "last12", label: "Last 12 months" },
];

function CategoryHistoryPage() {
  const categoryHistory = Route.useLoaderData();
  const { range, transfers } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { startMonth, endMonth, totalBudgeted, totalSpent } = categoryHistory;
  const startMonthFormatted = monthFormatter.format(parseISO(startMonth));
  const endMonthFormatted = monthFormatter.format(parseISO(endMonth));
  const totalTransactions = categoryHistory.transactions.length;
  const monthCount = categoryHistory.monthlyBreakdown.length;
  const percentageUsed = (totalBudgeted === 0 ? 1 : totalSpent / totalBudgeted) * 100;

  return (
    <PageContainer size="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="sm" align="center">
              <Title order={1} size="2.5rem" fw="bold">
                {categoryHistory.category.name}
              </Title>
              <CategoryTypeIcons
                accumulating={categoryHistory.category.accumulating}
                flexible={categoryHistory.category.flexible}
                size={28}
              />
            </Group>
            <Text size="lg" c="gray.6">
              {startMonth === endMonth
                ? startMonthFormatted
                : `${startMonthFormatted} - ${endMonthFormatted}`}
            </Text>
          </div>
          <CategoryType
            categoryId={categoryHistory.category.id}
            accumulating={categoryHistory.category.accumulating}
            flexible={categoryHistory.category.flexible}
          />
        </Group>

        <Stack gap="md">
          <Group gap="xs">
            {rangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={range === option.value ? "filled" : "outline"}
                size="sm"
                onClick={() => navigate({ search: (prev) => ({ ...prev, range: option.value }) })}
              >
                {option.label}
              </Button>
            ))}
          </Group>

          <Group gap="xl">
            <Switch
              label="Include transfers"
              checked={transfers}
              onChange={(event) =>
                navigate({ search: (prev) => ({ ...prev, transfers: event.target.checked }) })
              }
            />
          </Group>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="lg">
          <Card>
            <Stack gap="xs">
              <Text size="sm" c="gray.6">
                Total Budgeted
              </Text>
              <Text size="2.25rem" fw="bold">
                {formatCurrency(totalBudgeted)}
              </Text>
            </Stack>
          </Card>

          <Card>
            <Stack gap="xs">
              <Text size="sm" c="gray.6">
                Total Spent
              </Text>
              <Text size="2.25rem" fw="bold" c={totalSpent > totalBudgeted ? "red" : undefined}>
                {formatCurrency(totalSpent)}
              </Text>
            </Stack>
          </Card>

          <Card>
            <Stack gap="xs">
              <Text size="sm" c="gray.6">
                Percentage Used
              </Text>
              <Text size="2.25rem" fw="bold" c={percentageUsed > 100 ? "red" : undefined}>
                {percentageUsed.toFixed(1)}%
              </Text>
            </Stack>
          </Card>

          <Card>
            <Stack gap="xs">
              <Text size="sm" c="gray.6">
                Spent per Month
              </Text>
              <Text size="2.25rem" fw="bold">
                {formatCurrency(totalSpent / monthCount)}
              </Text>
            </Stack>
          </Card>

          <Card>
            <Stack gap="xs">
              <Text size="sm" c="gray.6">
                Transactions per Month
              </Text>
              <Text size="2.25rem" fw="bold">
                {(totalTransactions / monthCount).toFixed(1)}
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>

        <Card>
          <Stack gap="md">
            <Title order={3}>Monthly Breakdown</Title>
            <CategoryHistoryChart monthlyData={categoryHistory.monthlyBreakdown} />
          </Stack>
        </Card>

        <div>
          <Title order={3} mb="md">
            Transaction History
          </Title>
          <TransactionTable transactions={categoryHistory.transactions} />
        </div>
      </Stack>
    </PageContainer>
  );
}
