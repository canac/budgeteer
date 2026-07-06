import { Card, Group, Stack, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { parseISO } from "date-fns";
import { AddTransactionButton } from "~/components/AddTransactionButton";
import { TransactionList } from "~/components/TransactionList";
import { getBudgetTransactions } from "~/functions/getBudgetTransactions";
import { monthFormatter, monthOnlyFormatter } from "~/lib/formatters";

export const Route = createFileRoute("/_layout/budget/$month/transactions")({
  component: TransactionsPage,
  loader: async ({ params: { month } }) => {
    const transactions = await getBudgetTransactions({ data: { month } });
    return { transactions };
  },
  head: ({ params }) => {
    const month = monthFormatter.format(parseISO(params.month));
    return {
      meta: [{ title: `Transactions - ${month} | Budgeteer` }],
    };
  },
});

function TransactionsPage() {
  const { transactions } = Route.useLoaderData();
  const { month } = Route.useParams();

  return (
    <Card shadow="sm">
      <Stack gap="xs">
        <Group justify="space-between">
          <Group gap="xs">
            <Title order={2}>Transactions</Title>
            <AddTransactionButton />
          </Group>
          <Text c="dimmed">
            {transactions.length} in {monthOnlyFormatter.format(parseISO(month))}
          </Text>
        </Group>
        <TransactionList transactions={transactions} showCategories month={month} />
      </Stack>
    </Card>
  );
}
