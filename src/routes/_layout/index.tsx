import { BarChart } from "@mantine/charts";
import { Card, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { createFileRoute } from "@tanstack/react-router";
import { parseISO } from "date-fns";
import { MantineLink } from "~/components/MantineLink";
import { PageContainer } from "~/components/PageContainer";
import { getOverview } from "~/functions/getOverview";
import { formatCurrency, monthFormatter, percentageFormatter } from "~/lib/formatters";

interface ChartDatum {
  category: string;
  percentageSpent: number;
  spent: number;
  budgeted: number;
}

function isChartDatum(value: unknown): value is ChartDatum {
  return typeof value === "object" && value !== null && "percentageSpent" in value;
}

function Tooltip({ datum }: { datum: ChartDatum }) {
  return (
    <Paper px="md" py="sm" shadow="md" radius="md" withBorder miw={200}>
      <Text fw={500} mb="xs">
        {datum.category}
      </Text>
      <Group justify="space-between" wrap="nowrap" gap="xl">
        <Group gap="sm" wrap="nowrap">
          <svg width={12} height={12} style={{ minWidth: 12 }}>
            <circle r={6} cx={6} cy={6} fill="var(--mantine-color-green-6)" />
          </svg>
          <Text size="sm">Percentage spent</Text>
        </Group>
        <Text size="sm" c="bright">
          {percentageFormatter.format(datum.percentageSpent)}
        </Text>
      </Group>
      <Text size="sm" c="dimmed" mt={4} ml="calc(12px + var(--mantine-spacing-sm))">
        {formatCurrency(datum.spent)} of {formatCurrency(datum.budgeted)}
      </Text>
    </Paper>
  );
}

export const Route = createFileRoute("/_layout/")({
  component: OverviewPage,
  loader: () => getOverview(),
  head: () => ({ meta: [{ title: "Overview | Budgeteer" }] }),
});

function OverviewPage() {
  const {
    month,
    totalSpent,
    totalBudgeted,
    monthProgressionPercentage,
    categories,
    leftoverBalance,
  } = Route.useLoaderData();

  const isMobile = useMediaQuery("(max-width: 48em)");

  const chartData: ChartDatum[] = [
    ...categories.map(({ category, spent, budgeted }) => ({
      category: category.name,
      percentageSpent: budgeted === 0 ? 1 : spent / budgeted,
      spent,
      budgeted,
    })),
    {
      category: "Total",
      percentageSpent: totalBudgeted === 0 ? 1 : totalSpent / totalBudgeted,
      spent: totalSpent,
      budgeted: totalBudgeted,
    },
  ];

  return (
    <PageContainer>
      <Stack gap="xl">
        <Title order={1}>
          <MantineLink to="/budget/$month" params={{ month }} c="inherit" inherit>
            {monthFormatter.format(parseISO(month))}
          </MantineLink>
        </Title>

        <SimpleGrid cols={{ base: 1, sm: 4 }}>
          <Card shadow="sm">
            <Stack gap="xs">
              <Text size="sm" c="dimmed" fw={500}>
                Total Spent
              </Text>
              <Text size="xl" fw={700}>
                {formatCurrency(totalSpent)}
              </Text>
            </Stack>
          </Card>

          <Card shadow="sm">
            <Stack gap="xs">
              <Text size="sm" c="dimmed" fw={500}>
                Total Budgeted
              </Text>
              <Text size="xl" fw={700}>
                {formatCurrency(totalBudgeted)}
              </Text>
            </Stack>
          </Card>

          <Card shadow="sm">
            <Stack gap="xs">
              <Text size="sm" c="dimmed" fw={500}>
                Remaining
              </Text>
              <Text size="xl" fw={700} c={totalSpent > totalBudgeted ? "red" : "green"}>
                {formatCurrency(totalBudgeted - totalSpent)}
              </Text>
            </Stack>
          </Card>

          <Card shadow="sm">
            <Stack gap="xs">
              <Text size="sm" c="dimmed" fw={500}>
                Leftover
              </Text>
              <Text size="xl" fw={700} c={leftoverBalance < 0 ? "red" : "green"}>
                {formatCurrency(leftoverBalance)}
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>

        <Card shadow="sm">
          <Stack gap="md">
            <Title order={3}>Spending by category</Title>
            <BarChart
              h={Math.max(300, chartData.length * 40)}
              data={chartData}
              dataKey="category"
              series={[{ name: "percentageSpent", label: "Percentage spent", color: "green.6" }]}
              referenceLines={[
                {
                  x: monthProgressionPercentage,
                  label: isMobile
                    ? percentageFormatter.format(monthProgressionPercentage)
                    : `${percentageFormatter.format(monthProgressionPercentage)} through the month`,
                  color: "red.6",
                },
              ]}
              maxBarWidth={40}
              orientation="vertical"
              valueFormatter={(value) => percentageFormatter.format(value)}
              xAxisProps={{ domain: [0, 1], allowDataOverflow: true }}
              yAxisProps={{ width: 100 }}
              tooltipProps={{
                content: ({ payload }) => {
                  const datum: unknown = payload[0]?.payload;
                  return isChartDatum(datum) ? <Tooltip datum={datum} /> : null;
                },
              }}
            />
          </Stack>
        </Card>
      </Stack>
    </PageContainer>
  );
}
