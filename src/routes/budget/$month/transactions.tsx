import { Drawer, Stack, Table, Text } from "@mantine/core";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { format } from "date-fns";
import { MantineLink } from "~/components/MantineLink";
import { getBudgetTransactions } from "~/functions/getBudgetTransactions";
import { formatCurrency } from "~/lib/formatCurrency";

export const Route = createFileRoute("/budget/$month/transactions")({
  component: TransactionsPage,
  loader: async ({ params: { month } }) => {
    const transactions = await getBudgetTransactions({
      data: { month },
    });
    return { transactions };
  },
});

function TransactionsPage() {
  const router = useRouter();
  const { transactions } = Route.useLoaderData();
  const { month } = Route.useParams();

  const handleClose = () => {
    router.navigate({ to: "/budget/$month", params: { month } });
  };

  return (
    <Drawer
      opened={true}
      onClose={handleClose}
      position="right"
      size="xl"
      title={<Text fw="bold">Transactions</Text>}
      overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
    >
      <Stack gap="md">
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Vendor</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Categories</Table.Th>
              <Table.Th ta="right">Amount</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {transactions.map((transaction) => (
              <Table.Tr key={transaction.id}>
                <Table.Td>{format(new Date(transaction.date), "MMM dd")}</Table.Td>
                <Table.Td>{transaction.vendor}</Table.Td>
                <Table.Td>{transaction.description}</Table.Td>
                <Table.Td>
                  {transaction.transactionCategories.map((category, index, array) => (
                    <>
                      <MantineLink
                        key={category.id}
                        to="/budget/$month/category/$category"
                        params={{
                          month,
                          category: category.id.toString(),
                        }}
                        fz="inherit"
                      >
                        {category.name}
                      </MantineLink>
                      {index < array.length - 1 && " • "}
                    </>
                  ))}
                </Table.Td>
                <Table.Td ta="right" c={transaction.amount < 0 ? "red" : "green"}>
                  {formatCurrency(transaction.amount)}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Drawer>
  );
}
