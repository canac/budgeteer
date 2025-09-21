import { ActionIcon, Group, Table } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { format } from "date-fns";
import type { Transaction } from "generated/prisma/client";
import { useState } from "react";
import {
  DeleteTransactionModal,
  type DeleteTransactionModalProps,
} from "~/components/DeleteTransactionModal";
import { getTransaction } from "~/functions/getTransaction";
import { formatCurrency } from "~/lib/formatCurrency";
import { TransactionModal, type TransactionModalProps } from "./TransactionModal";
import "./TransactionTable.css";

interface TransactionTableProps {
  transactions: Array<Pick<Transaction, "id" | "date" | "vendor" | "description" | "amount">>;
  startingBalance: number;
  startingBalanceDate: Date;
  onUpdate: () => Promise<void>;
}

export function TransactionTable({
  transactions,
  startingBalance,
  startingBalanceDate,
  onUpdate,
}: TransactionTableProps) {
  const [deletingTransaction, setDeletingTransaction] = useState<
    DeleteTransactionModalProps["transaction"] | null
  >(null);
  const [editingTransaction, setEditingTransaction] = useState<
    TransactionModalProps["editingTransaction"] | null
  >(null);

  const handleDeleteTransaction = (transaction: DeleteTransactionModalProps["transaction"]) => {
    setDeletingTransaction(transaction);
  };
  const handleEditTransaction = async (
    transaction: TransactionTableProps["transactions"][number],
  ) => {
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
          onDelete={onUpdate}
        />
      )}
      {editingTransaction && (
        <TransactionModal
          onClose={() => setEditingTransaction(null)}
          editingTransaction={editingTransaction}
          onSave={onUpdate}
        />
      )}
      <Table className="TransactionTable" striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            <Table.Th>Vendor</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th ta="right">Amount</Table.Th>
            <Table.Th ta="center">Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {transactions.map((transaction) => (
            <Table.Tr key={transaction.id}>
              <Table.Td>{format(transaction.date, "MMM dd")}</Table.Td>
              <Table.Td>{transaction.vendor}</Table.Td>
              <Table.Td>{transaction.description}</Table.Td>
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
          <Table.Tr className="starting-balance">
            <Table.Td>{format(startingBalanceDate, "MMM dd")}</Table.Td>
            <Table.Td>Starting Balance</Table.Td>
            <Table.Td></Table.Td>
            <Table.Td ta="right" c={startingBalance < 0 ? "red" : "green"}>
              {formatCurrency(startingBalance)}
            </Table.Td>
            <Table.Td />
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </>
  );
}
