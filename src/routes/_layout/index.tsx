import { BarChart } from "@mantine/charts";
import { Card, Container, Group, Stack, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { parseISO } from "date-fns";
import { getOverview } from "~/functions/getOverview";
import { formatCurrency, monthFormatter, percentageFormatter } from "~/lib/formatters";

export const Route = createFileRoute("/_layout/")({
  component: OverviewPage,
  loader: () => getOverview(),
});

function OverviewPage() {
  const { month, totalSpent, totalBudgeted, monthProgressionPercentage, categories } =
    Route.useLoaderData();

  const chartData = [
    ...categories.map(({ category, spent, budgeted }) => ({
      category: category.name,
      percentageSpent: budgeted === 0 ? 1 : spent / budgeted,
    })),
    {
      category: "Total",
      percentageSpent: totalBudgeted === 0 ? 1 : totalSpent / totalBudgeted,
    },
  ];

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Title order={1}>{monthFormatter.format(parseISO(month))}</Title>

        <Group grow align="stretch">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed" fw={500}>
                Total Spent
              </Text>
              <Text size="xl" fw={700}>
                {formatCurrency(totalSpent)}
              </Text>
            </Stack>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed" fw={500}>
                Total Budgeted
              </Text>
              <Text size="xl" fw={700}>
                {formatCurrency(totalBudgeted)}
              </Text>
            </Stack>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed" fw={500}>
                Remaining
              </Text>
              <Text size="xl" fw={700} c={totalSpent > totalBudgeted ? "red" : "green"}>
                {formatCurrency(totalBudgeted - totalSpent)}
              </Text>
            </Stack>
          </Card>
        </Group>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={3}>Spending by Category</Title>
            <BarChart
              h={Math.max(300, chartData.length * 40)}
              data={chartData}
              dataKey="category"
              series={[{ name: "percentageSpent", label: "Percentage spent", color: "green.6" }]}
              referenceLines={[
                {
                  x: monthProgressionPercentage,
                  label: `${percentageFormatter.format(monthProgressionPercentage)} through the month`,
                  color: "red.6",
                },
              ]}
              maxBarWidth={40}
              orientation="vertical"
              valueFormatter={(value) => percentageFormatter.format(value)}
              xAxisProps={{ domain: [0, 1], allowDataOverflow: true }}
              yAxisProps={{ width: 100 }}
            />
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
