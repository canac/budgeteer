import { ActionIcon, Drawer, Group, Stack, Table, Text } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { format } from "date-fns";
import { Fragment, useState } from "react";
import {
  DeleteTransactionModal,
  type DeleteTransactionModalProps,
} from "~/components/DeleteTransactionModal";
import { MantineLink } from "~/components/MantineLink";
import { TransactionModal, type TransactionModalProps } from "~/components/TransactionModal";
import { getBudgetTransactions } from "~/functions/getBudgetTransactions";
import { formatCurrency } from "~/lib/formatCurrency";

type DeleteTransaction = DeleteTransactionModalProps["transaction"];
type EditTransaction = TransactionModalProps["editingTransaction"];

export const Route = createFileRoute("/budget/$month/transactions")({
  component: TransactionsPage,
  loader: async ({ params: { month } }) => {
    const transactions = await getBudgetTransactions({ data: { month } });
    return { transactions };
  },
});

function TransactionsPage() {
  const router = useRouter();
  const { transactions } = Route.useLoaderData();
  const { month } = Route.useParams();
  const [deletingTransaction, setDeletingTransaction] = useState<DeleteTransaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<EditTransaction | null>(null);

  const handleClose = () => {
    router.navigate({ to: "/budget/$month", params: { month } });
  };

  const handleDeleteTransaction = (transaction: DeleteTransaction) => {
    setDeletingTransaction(transaction);
  };

  const handleEditTransaction = (transaction: EditTransaction) => {
    setEditingTransaction(transaction);
  };

  const handleTransactionUpdated = async () => {
    setEditingTransaction(null);
    await router.invalidate();
  };

  const handleTransactionDeleted = async () => {
    await router.invalidate();
  };

  return (
    <>
      {editingTransaction && (
        <TransactionModal
          onClose={() => setEditingTransaction(null)}
          onSave={handleTransactionUpdated}
          editingTransaction={editingTransaction}
        />
      )}
      {deletingTransaction && (
        <DeleteTransactionModal
          onClose={() => setDeletingTransaction(null)}
          transaction={deletingTransaction}
          onDelete={handleTransactionDeleted}
        />
      )}
      <Drawer
        opened
        onClose={handleClose}
        position="right"
        size="xl"
        title={<Text fw="bold">Transactions</Text>}
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
                <Table.Th ta="center">Actions</Table.Th>
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
                      <Fragment key={category.id}>
                        <MantineLink
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
                      </Fragment>
                    ))}
                  </Table.Td>
                  <Table.Td ta="right" c={transaction.amount < 0 ? undefined : "green"}>
                    {formatCurrency(transaction.amount)}
                  </Table.Td>
                  <Table.Td ta="center">
                    <Group gap="xs" justify="center">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => handleEditTransaction(transaction)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => handleDeleteTransaction(transaction)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Drawer>
    </>
  );
}
