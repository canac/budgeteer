import { ActionIcon, Table } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconArrowBackUp,
  IconArrowsExchange,
  IconCheck,
  IconEdit,
  IconX,
} from "@tabler/icons-react";
import { parseISO } from "date-fns";
import { useState } from "react";
import type { UnreviewedTransaction } from "~/functions/getUnreviewedTransactions";
import { DynamicImportTransactionModal } from "~/components/DynamicImportTransactionModal";
import { formatCurrency, shortDateFormatter } from "~/lib/formatters";
import "./UnreviewedTransactions.css";

interface UnreviewedTransactionsProps {
  transactions: UnreviewedTransaction[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onReconcile?: (transaction: UnreviewedTransaction) => void;
  onEdit: (id: string) => void;
  onRestore?: (id: string) => void;
}

export function UnreviewedTransactions({
  transactions,
  onAccept,
  onReject,
  onAcknowledge,
  onReconcile,
  onEdit,
  onRestore,
}: UnreviewedTransactionsProps) {
  const [modalOpen, { open, close }] = useDisclosure(false);
  const [importingTransaction, setImportingTransaction] = useState<
    UnreviewedTransaction | undefined
  >(undefined);

  const openImport = (transaction: UnreviewedTransaction) => {
    setImportingTransaction(transaction);
    open();
  };

  const handleImport = () => {
    if (importingTransaction) {
      onEdit(importingTransaction.id);
    }
  };

  return (
    <>
      <Table className="UnreviewedTransactions">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            <Table.Th>Vendor</Table.Th>
            <Table.Th>Category</Table.Th>
            <Table.Th>Account</Table.Th>
            <Table.Th ta="right">Amount</Table.Th>
            <Table.Th ta="center">Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {transactions.map((transaction) => (
            <Table.Tr key={transaction.id}>
              <Table.Td>{shortDateFormatter.format(parseISO(transaction.date))}</Table.Td>
              <Table.Td className="wrap" fs={transaction.rule ? undefined : "italic"}>
                {transaction.rule?.vendor ?? transaction.vendor}
              </Table.Td>
              <Table.Td>{transaction.rule?.category?.name}</Table.Td>
              <Table.Td>{transaction.account.name}</Table.Td>
              <Table.Td className={transaction.amount >= 0 ? "positive" : undefined} ta="right">
                {formatCurrency(transaction.amount)}
              </Table.Td>
              <Table.Td ta="center">
                {transaction.changedAt ? (
                  <>
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      aria-label="Reconcile"
                      onClick={() => onReconcile?.(transaction)}
                    >
                      <IconArrowsExchange />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="green"
                      aria-label="Acknowledge"
                      onClick={() => onAcknowledge?.(transaction.id)}
                    >
                      <IconCheck />
                    </ActionIcon>
                  </>
                ) : transaction.reviewed ? (
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    aria-label="Restore"
                    onClick={() => onRestore?.(transaction.id)}
                  >
                    <IconArrowBackUp />
                  </ActionIcon>
                ) : (
                  <>
                    <ActionIcon
                      variant="subtle"
                      color="green"
                      aria-label="Accept"
                      style={{ visibility: transaction.rule?.category ? undefined : "hidden" }}
                      onClick={() => onAccept(transaction.id)}
                    >
                      <IconCheck />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      aria-label="Edit"
                      onClick={() => openImport(transaction)}
                    >
                      <IconEdit />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label="Reject"
                      onClick={() => onReject(transaction.id)}
                    >
                      <IconX />
                    </ActionIcon>
                  </>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {modalOpen && importingTransaction && (
        <DynamicImportTransactionModal
          onClose={close}
          onSave={handleImport}
          transaction={importingTransaction}
        />
      )}
    </>
  );
}
