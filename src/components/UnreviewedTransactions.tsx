import { ActionIcon, Badge, Group, Text } from "@mantine/core";
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
import { TransactionRow } from "~/components/TransactionList";
import { formatCurrency } from "~/lib/formatters";
import "./TransactionList.css";

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
      <div className="TransactionList">
        {transactions.map((transaction) => {
          const vendor = transaction.rule?.vendor ?? transaction.vendor;
          const category = transaction.rule?.category?.name;

          return (
            <TransactionRow
              key={transaction.id}
              title={
                transaction.rule ? (
                  vendor
                ) : (
                  <Text span fs="italic">
                    {vendor}
                  </Text>
                )
              }
              date={parseISO(transaction.date)}
              description={transaction.account.name}
              categories={
                category ? (
                  <Badge variant="light" color="gray" size="lg" tt="none">
                    {category}
                  </Badge>
                ) : undefined
              }
              amount={
                <Text className={transaction.amount >= 0 ? "positive" : undefined}>
                  {formatCurrency(transaction.amount)}
                </Text>
              }
              actions={
                <Group gap={4} wrap="nowrap">
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
                </Group>
              }
            />
          );
        })}
      </div>
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
