import { ActionIcon, Group, Table, ThemeIcon } from "@mantine/core";
import { IconArrowsRightLeft, IconEdit, IconPencilDollar, IconTrash } from "@tabler/icons-react";
import { linkOptions, useRouter } from "@tanstack/react-router";
import { parseISO } from "date-fns";
import { Fragment, type ReactNode, useState } from "react";
import type { getBudgetCategory } from "~/functions/getBudgetCategory";
import type { Category } from "~/prisma/client";
import {
  DeleteTransactionModal,
  type DeleteTransactionModalProps,
} from "~/components/DeleteTransactionModal";
import { MantineLink } from "~/components/MantineLink";
import { getTransaction } from "~/functions/getTransaction";
import { formatCurrency, shortDateFormatter } from "~/lib/formatters";
import { TransactionModal, type TransactionModalProps } from "./TransactionModal";
import "./TransactionTable.css";

type BaseTransaction = Awaited<ReturnType<typeof getBudgetCategory>>["transactions"][number];
type CategoryRef = Pick<Category, "id" | "name">;

type TableTransaction = Omit<BaseTransaction, "transfer"> & {
  transfer:
    | (NonNullable<BaseTransaction["transfer"]> & {
        sourceCategory?: CategoryRef;
        destinationCategory?: CategoryRef;
      })
    | null;
  transactionCategories?: CategoryRef[];
};

interface TransactionTableProps {
  transactions: TableTransaction[];
  extraRows?: ReactNode;
  showCategories?: boolean;
  month?: string;
}

interface CategoryLinkProps {
  month?: string;
  category: CategoryRef;
}

function CategoryLink({ month, category }: CategoryLinkProps) {
  const link = month
    ? linkOptions({
        to: "/budget/$month/category/$category",
        params: { month, category: category.id },
      })
    : linkOptions({
        to: "/category/$category",
        params: { category: category.id },
      });

  return (
    <MantineLink {...link} fz="inherit">
      {category.name}
    </MantineLink>
  );
}

export function TransactionTable({
  transactions,
  extraRows,
  showCategories,
  month,
}: TransactionTableProps) {
  const router = useRouter();
  const [deletingTransaction, setDeletingTransaction] = useState<
    DeleteTransactionModalProps["transaction"] | null
  >(null);
  const [editingTransaction, setEditingTransaction] = useState<
    TransactionModalProps["editingTransaction"] | null
  >(null);

  const handleUpdate = () => router.invalidate();

  const handleDeleteTransaction = (transaction: DeleteTransactionModalProps["transaction"]) => {
    setDeletingTransaction(transaction);
  };
  const handleEditTransaction = async (transaction: TableTransaction) => {
    setEditingTransaction(
      await getTransaction({
        data: { id: transaction.id },
      }),
    );
  };

  return (
    <>
      {deletingTransaction && (
        <DeleteTransactionModal
          onClose={() => setDeletingTransaction(null)}
          transaction={deletingTransaction}
          onDelete={handleUpdate}
        />
      )}
      {editingTransaction && (
        <TransactionModal
          onClose={() => setEditingTransaction(null)}
          editingTransaction={editingTransaction}
          onSave={handleUpdate}
        />
      )}
      <Table className="TransactionTable">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            <Table.Th>Vendor</Table.Th>
            <Table.Th>Description</Table.Th>
            {showCategories && <Table.Th>Categories</Table.Th>}
            <Table.Th ta="right">Amount</Table.Th>
            <Table.Th ta="center">Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {transactions.map((transaction) => (
            <Table.Tr key={transaction.id}>
              <Table.Td>{shortDateFormatter.format(parseISO(transaction.date))}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  {transaction.type === "BALANCE_ADJUSTMENT" && (
                    <ThemeIcon className="transaction-type">
                      <IconPencilDollar />
                    </ThemeIcon>
                  )}
                  {transaction.type === "TRANSFER" && (
                    <ThemeIcon className="transaction-type">
                      <IconArrowsRightLeft />
                    </ThemeIcon>
                  )}
                  {transaction.vendor}
                </Group>
              </Table.Td>
              <Table.Td>{transaction.description}</Table.Td>
              {showCategories && (
                <Table.Td>
                  {transaction.transfer ? (
                    <>
                      {transaction.transfer.sourceCategory && (
                        <CategoryLink
                          month={month}
                          category={transaction.transfer.sourceCategory}
                        />
                      )}
                      {" → "}
                      {transaction.transfer.destinationCategory && (
                        <CategoryLink
                          month={month}
                          category={transaction.transfer.destinationCategory}
                        />
                      )}
                    </>
                  ) : (
                    transaction.transactionCategories?.map((category, index, array) => (
                      <Fragment key={category.id}>
                        <CategoryLink month={month} category={category} />
                        {index < array.length - 1 && " • "}
                      </Fragment>
                    ))
                  )}
                </Table.Td>
              )}
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
                    disabled={transaction.type !== "TRANSACTION"}
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
          {extraRows}
        </Table.Tbody>
      </Table>
    </>
  );
}
