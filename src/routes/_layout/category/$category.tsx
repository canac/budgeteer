import {
  Button,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { parseISO, subMonths } from "date-fns";
import { _default, coerce, object } from "zod/mini";
import { CategoryHistoryChart } from "~/components/CategoryHistoryChart";
import { CategoryType } from "~/components/CategoryType";
import { TransactionTable } from "~/components/TransactionTable";
import { getCategoryHistory } from "~/functions/getCategoryHistory";
import { formatCurrency, monthFormatter } from "~/lib/formatters";
import { toISOMonthString } from "~/lib/iso";

const searchSchema = object({
  months: _default(coerce.number(), 6),
  incomplete: _default(coerce.boolean(), true),
  transfers: _default(coerce.boolean(), false),
});

export const Route = createFileRoute("/_layout/category/$category")({
  component: CategoryHistoryPage,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { months, incomplete, transfers } }) => ({
    months,
    incomplete,
    transfers,
  }),
  loader: ({ params: { category }, deps: { months, incomplete, transfers } }) => {
    const currentDate = new Date();
    const startMonth = toISOMonthString(subMonths(currentDate, months));
    const endMonth = toISOMonthString(incomplete ? currentDate : subMonths(currentDate, 1));
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

const monthOptions = [
  { value: 1, label: "1 Month" },
  { value: 3, label: "3 Months" },
  { value: 6, label: "6 Months" },
  { value: 12, label: "12 Months" },
  { value: 24, label: "24 Months" },
];

function CategoryHistoryPage() {
  const categoryHistory = Route.useLoaderData();
  const { months, incomplete, transfers } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { startMonth, endMonth, totalBudgeted, totalSpent } = categoryHistory;
  const startMonthFormatted = monthFormatter.format(parseISO(startMonth));
  const endMonthFormatted = monthFormatter.format(parseISO(endMonth));
  const totalTransactions = categoryHistory.transactions.length;
  const monthCount = categoryHistory.monthlyBreakdown.length;
  const percentageUsed = (totalBudgeted === 0 ? 1 : totalSpent / totalBudgeted) * 100;

  return (
    <Container size="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1} size="2.5rem" fw="bold">
              {categoryHistory.category.name}
            </Title>
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
            {monthOptions.map((option) => (
              <Button
                key={option.value}
                variant={months === option.value ? "filled" : "outline"}
                size="sm"
                onClick={() => navigate({ search: (prev) => ({ ...prev, months: option.value }) })}
              >
                {option.label}
              </Button>
            ))}
          </Group>

          <Group gap="xl">
            <Switch
              label="Include current month"
              checked={incomplete}
              onChange={(event) =>
                navigate({ search: (prev) => ({ ...prev, incomplete: event.target.checked }) })
              }
            />
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
    </Container>
  );
}
