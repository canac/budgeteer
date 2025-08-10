import { createFileRoute } from "@tanstack/react-router";
import { getBudgetByMonth } from "../../lib/prisma";
import { Container, Group, List, Paper, Stack, Title } from "@mantine/core";
import { parse, format, startOfMonth } from "date-fns";

export const Route = createFileRoute("/budget/$month")({
  component: BudgetPage,
  loader: async ({ params: { month } }) => {
    if (!/^\d{2}-\d{4}$/.test(month)) {
      throw new Response("Invalid month format", { status: 400 });
    }
    const budget = await getBudgetByMonth(month);
    if (!budget) {
      throw new Response("Budget not found", { status: 404 });
    }
    return { budget };
  },
});

export default function BudgetPage() {
  const { budget } = Route.useLoaderData();

  // budget.month is ISO string
  const date = parse(budget.month, "MM-yyyy", startOfMonth(new Date()));
  const header = format(date, "MMMM yyyy");

  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={1}>{header}</Title>
        <Group align="flex-start" grow>
          <Paper shadow="xs" p="md" withBorder>
            <Title order={2} size="h4" mb="sm">
              Categories
            </Title>
            <List spacing="xs">
              {budget.categories.map((cat: any) => (
                <List.Item key={cat.id}>{cat.name}</List.Item>
              ))}
            </List>
          </Paper>
          <Paper shadow="xs" p="md" withBorder>
            <Title order={2} size="h4" mb="sm">
              Funds
            </Title>
            <List spacing="xs">
              {budget.funds.map((fund: any) => (
                <List.Item key={fund.id}>
                  {fund.name}: {fund.initialBalance}
                </List.Item>
              ))}
            </List>
          </Paper>
        </Group>
      </Stack>
    </Container>
  );
}
