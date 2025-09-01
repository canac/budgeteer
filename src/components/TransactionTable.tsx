import { ActionIcon, Table } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { format } from "date-fns";
import type { Transaction } from "generated/prisma/client";
import { useState } from "react";
import {
  DeleteTransactionModal,
  type DeleteTransactionModalProps,
} from "~/components/DeleteTransactionModal";
import { formatCurrency } from "~/lib/formatCurrency";
import classes from "./TransactionTable.module.css";

interface TransactionTableProps {
  transactions: Array<Pick<Transaction, "id" | "date" | "vendor" | "description" | "amount">>;
  startingBalance: number;
  startingBalanceDate: Date;
  onTransactionDeleted?: () => Promise<void>;
}

export function TransactionTable({
  transactions,
  startingBalance,
  startingBalanceDate,
  onTransactionDeleted,
}: TransactionTableProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<
    DeleteTransactionModalProps["transaction"] | null
  >(null);

  const handleDeleteTransaction = (transaction: DeleteTransactionModalProps["transaction"]) => {
    setSelectedTransaction(transaction);
  };

  const handleTransactionDeleted = async () => {
    if (onTransactionDeleted) {
      await onTransactionDeleted();
    }
  };

  return (
    <>
      {selectedTransaction && (
        <DeleteTransactionModal
          open
          onClose={() => setSelectedTransaction(null)}
          transaction={selectedTransaction}
          onDelete={handleTransactionDeleted}
        />
      )}
      <Table striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            <Table.Th>Vendor</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th ta="right">Amount</Table.Th>
            {onTransactionDeleted && <Table.Th ta="center">Actions</Table.Th>}
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
              {onTransactionDeleted && (
                <Table.Td ta="center">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => handleDeleteTransaction(transaction)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Table.Td>
              )}
            </Table.Tr>
          ))}
          <Table.Tr className={classes.startingBalanceRow}>
            <Table.Td>{format(startingBalanceDate, "MMM dd")}</Table.Td>
            <Table.Td>Starting Balance</Table.Td>
            <Table.Td></Table.Td>
            <Table.Td ta="right" c={startingBalance < 0 ? "red" : "green"}>
              {formatCurrency(startingBalance)}
            </Table.Td>
            {onTransactionDeleted && <Table.Td></Table.Td>}
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </>
  );
}
