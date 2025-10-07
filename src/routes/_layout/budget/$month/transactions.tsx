import { ActionIcon, Drawer, Group, Stack, Table } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { format } from "date-fns";
import type { Category } from "generated/prisma/client";
import { Fragment, useState } from "react";
import { AddTransactionButton } from "~/components/AddTransactionButton";
import type { DeleteTransactionModalProps } from "~/components/DeleteTransactionModal";
import { DynamicDeleteTransactionModal } from "~/components/DynamicDeleteTransactionModal";
import { DynamicTransactionModal } from "~/components/DynamicTransactionModal";
import { MantineLink } from "~/components/MantineLink";
import type { TransactionModalProps } from "~/components/TransactionModal";
import { getBudgetTransactions } from "~/functions/getBudgetTransactions";
import { useOpened } from "~/hooks/useOpened";
import { formatCurrency } from "~/lib/formatCurrency";

type DeleteTransaction = DeleteTransactionModalProps["transaction"];
type EditTransaction = TransactionModalProps["editingTransaction"];

export const Route = createFileRoute("/_layout/budget/$month/transactions")({
  component: TransactionsPage,
  loader: async ({ params: { month } }) => {
    const transactions = await getBudgetTransactions({ data: { month } });
    return { transactions };
  },
});

interface CategoryLinkProps {
  month: string;
  category: Pick<Category, "id" | "name">;
}

function CategoryLink({ month, category }: CategoryLinkProps) {
  return (
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
  );
}

function TransactionsPage() {
  const router = useRouter();
  const { transactions } = Route.useLoaderData();
  const { month } = Route.useParams();
  const { modalProps } = useOpened({
    onClose: () => {
      router.navigate({ to: "/budget/$month", params: { month } });
    },
  });
  const [editingTransaction, setEditingTransaction] = useState<EditTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<DeleteTransaction | null>(null);

  const handleEditTransaction = (transaction: EditTransaction) => {
    setEditingTransaction(transaction);
  };

  const handleDeleteTransaction = (transaction: DeleteTransaction) => {
    setDeletingTransaction(transaction);
  };

  const handleUpdate = async () => {
    await router.invalidate();
  };

  return (
    <>
      {editingTransaction && (
        <DynamicTransactionModal
          onClose={() => setEditingTransaction(null)}
          onSave={handleUpdate}
          editingTransaction={editingTransaction}
        />
      )}
      {deletingTransaction && (
        <DynamicDeleteTransactionModal
          onClose={() => setDeletingTransaction(null)}
          transaction={deletingTransaction}
          onDelete={handleUpdate}
        />
      )}
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
                    {transaction.transfer ? (
                      <>
                        <CategoryLink
                          month={month}
                          category={transaction.transfer.sourceCategory}
                        />
                        {" → "}
                        <CategoryLink
                          month={month}
                          category={transaction.transfer.destinationCategory}
                        />
                      </>
                    ) : (
                      transaction.transactionCategories.map((category, index, array) => (
                        <Fragment key={category.id}>
                          <CategoryLink month={month} category={category} />
                          {index < array.length - 1 && " • "}
                        </Fragment>
                      ))
                    )}
                  </Table.Td>
                  <Table.Td
                    ta="right"
                    c={transaction.transfer || transaction.amount < 0 ? undefined : "green"}
                  >
                    {formatCurrency(transaction.transfer?.amount ?? transaction.amount)}
                  </Table.Td>
                  <Table.Td ta="center">
                    <Group gap="xs" justify="center">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => handleEditTransaction(transaction)}
                        disabled={transaction.transfer !== null}
                      >
                        <IconEdit />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => handleDeleteTransaction(transaction)}
                      >
                        <IconTrash />
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
