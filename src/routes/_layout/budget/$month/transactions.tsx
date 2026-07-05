import { Drawer, Group, Stack } from "@mantine/core";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { parseISO } from "date-fns";
import { AddTransactionButton } from "~/components/AddTransactionButton";
import { TransactionList } from "~/components/TransactionList";
import { getBudgetTransactions } from "~/functions/getBudgetTransactions";
import { useOpened } from "~/hooks/useOpened";
import { monthFormatter } from "~/lib/formatters";

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
  const router = useRouter();
  const { transactions } = Route.useLoaderData();
  const { month } = Route.useParams();
  const { modalProps } = useOpened({
    onClose: async () => {
      await router.navigate({ to: "/budget/$month", params: { month } });
    },
  });

  return (
    <Drawer
      {...modalProps}
      position="right"
      size="xl"
      title={
        <Group align="center" gap="xs" fw="bold">
          Transactions
          <AddTransactionButton />
        </Group>
      }
    >
      <Stack gap="md">
        <TransactionList transactions={transactions} showCategories month={month} />
      </Stack>
    </Drawer>
  );
}
