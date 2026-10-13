import { Button, Card, Grid, Group, Select, Stack, Switch, Text, Title } from "@mantine/core";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { parseISO, subMonths } from "date-fns";
import { coerce, enum as enumType, object, optional, string } from "zod/mini";
import { CategoryHeaderActions } from "~/components/CategoryHeaderActions";
import { CategoryHistoryChart } from "~/components/CategoryHistoryChart";
import { CategoryTypeIcons } from "~/components/CategoryTypeIcons";
import { PageContainer } from "~/components/PageContainer";
import { TransactionList } from "~/components/TransactionList";
import { getCategoryHistory } from "~/functions/getCategoryHistory";
import { useToday } from "~/hooks/useToday";
import { range as makeRange } from "~/lib/collections";
import { formatCurrency, monthFormatter, monthOnlyFormatter } from "~/lib/formatters";
import { toISOMonthString } from "~/lib/iso";
import "./CategoryHistoryPage.css";

const ranges = ["current", "last1", "last3", "last6", "last12"] as const;
type Range = (typeof ranges)[number];

const searchSchema = object({
  range: optional(enumType(ranges)),
  month: optional(string()),
  transfers: optional(coerce.boolean()),
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
  loaderDeps: ({ search: { range, month, transfers } }) => ({
    range,
    month,
    transfers,
  }),
  loader: ({ params: { category }, deps: { range = "current", month, transfers = false } }) => {
    const { startMonth, endMonth } = month
      ? { startMonth: month, endMonth: month }
      : getRangeMonths(range);
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

const statSpan = { base: 30, sm: 10, lg: 6 };
const wideStatSpan = { base: 30, sm: 15, lg: 6 };

function getMonthOptions(
  today: Date,
  budgetMonths: string[],
): Array<{ value: string; label: string }> {
  return makeRange(12)
    .map((offset) => subMonths(today, offset))
    .filter((date) => budgetMonths.includes(toISOMonthString(date)))
    .map((date) => {
      const formatter =
        date.getFullYear() === today.getFullYear() ? monthOnlyFormatter : monthFormatter;
      return { value: toISOMonthString(date), label: formatter.format(date) };
    });
}

function CategoryHistoryPage() {
  const categoryHistory = Route.useLoaderData();
  const { range = "current", month, transfers = false } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const today = useToday();
  const currentMonth = toISOMonthString(today);

  const { startMonth, endMonth, totalBudgeted, totalSpent } = categoryHistory;
  const startMonthFormatted = monthFormatter.format(parseISO(startMonth));
  const endMonthFormatted = monthFormatter.format(parseISO(endMonth));
  const totalTransactions = categoryHistory.transactions.length;
  const monthCount = categoryHistory.monthlyBreakdown.length;
  const percentageUsed = (totalBudgeted === 0 ? 1 : totalSpent / totalBudgeted) * 100;

  return (
    <PageContainer className="CategoryHistoryPage" size="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="sm" align="center">
              <Title order={1} size="2.5rem" fw="bold">
                {categoryHistory.category.name}
              </Title>
              <CategoryTypeIcons category={categoryHistory.category} size={28} />
              <CategoryHeaderActions
                category={categoryHistory.category}
                deletable={categoryHistory.deletable}
                month={currentMonth}
                onSave={() => router.invalidate()}
                onDelete={() => navigate({ to: "/budget/$month", params: { month: currentMonth } })}
              />
            </Group>
            <Text size="lg" c="gray.6">
              {startMonth === endMonth
                ? startMonthFormatted
                : `${startMonthFormatted} - ${endMonthFormatted}`}
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          <Group gap="xs">
            {rangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={!month && range === option.value ? "filled" : "outline"}
                size="sm"
                onClick={() =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      range: option.value === "current" ? undefined : option.value,
                      month: undefined,
                    }),
                  })
                }
              >
                {option.label}
              </Button>
            ))}
            <Select
              size="sm"
              placeholder="Choose a month"
              aria-label="Month"
              clearable
              value={month ?? null}
              data={getMonthOptions(today, categoryHistory.budgetMonths)}
              onChange={(value) =>
                navigate({
                  search: (prev) => ({ ...prev, range: undefined, month: value ?? undefined }),
                })
              }
            />
          </Group>

          <Group gap="xl">
            <Switch
              label="Include transfers"
              checked={transfers}
              onChange={(event) =>
                navigate({
                  search: (prev) => ({ ...prev, transfers: event.target.checked || undefined }),
                })
              }
            />
          </Group>
        </Stack>

        <Grid
          className="stats"
          columns={30}
          type="container"
          breakpoints={{ xs: "36rem", sm: "48rem", md: "62rem", lg: "80rem", xl: "88rem" }}
        >
          <Grid.Col span={statSpan}>
            <Card>
              <Stack>
                <Text className="label">Total Budgeted</Text>
                <Text className="value">{formatCurrency(totalBudgeted)}</Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={statSpan}>
            <Card>
              <Stack>
                <Text className="label">Total Spent</Text>
                <Text className="value" c={totalSpent > totalBudgeted ? "red" : undefined}>
                  {formatCurrency(totalSpent)}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={statSpan}>
            <Card>
              <Stack>
                <Text className="label">Percentage Used</Text>
                <Text className="value" c={percentageUsed > 100 ? "red" : undefined}>
                  {percentageUsed.toFixed(1)}%
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={wideStatSpan}>
            <Card>
              <Stack>
                <Text className="label">Spent per Month</Text>
                <Text className="value">{formatCurrency(totalSpent / monthCount)}</Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={wideStatSpan}>
            <Card>
              <Stack>
                <Text className="label">Transactions per Month</Text>
                <Text className="value">{(totalTransactions / monthCount).toFixed(1)}</Text>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

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
          <TransactionList transactions={categoryHistory.transactions} />
        </div>
      </Stack>
    </PageContainer>
  );
}
