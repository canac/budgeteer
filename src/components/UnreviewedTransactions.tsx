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
import { List, ListRow } from "~/components/List";
import { formatSignedCurrency, shortDateFormatter } from "~/lib/formatters";

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
      <List>
        {transactions.map((transaction) => {
          const vendor = transaction.rule?.vendor ?? transaction.vendor;
          const category = transaction.rule?.category?.name;

          return (
            <ListRow
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
              meta={
                <>
                  {shortDateFormatter.format(parseISO(transaction.date))}
                  <Text span inherit fs="italic">
                    {` · ${transaction.account.name}`}
                  </Text>
                </>
              }
              tags={
                category ? (
                  <Badge variant="light" color="gray" size="lg" tt="none">
                    {category}
                  </Badge>
                ) : undefined
              }
              value={
                <Text className={transaction.amount >= 0 ? "positive" : undefined}>
                  {formatSignedCurrency(transaction.amount)}
                </Text>
              }
              actions={
                <Group gap={4} wrap="nowrap">
                  {transaction.changedAt ? (
                    <>
                      <ActionIcon
                        variant="subtle"
                        size="lg"
                        color="blue"
                        aria-label="Reconcile"
                        onClick={() => onReconcile?.(transaction)}
                      >
                        <IconArrowsExchange />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        size="lg"
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
                      size="lg"
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
                        size="lg"
                        color="green"
                        aria-label="Accept"
                        style={{ visibility: transaction.rule?.category ? undefined : "hidden" }}
                        onClick={() => onAccept(transaction.id)}
                      >
                        <IconCheck />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        size="lg"
                        color="blue"
                        aria-label="Edit"
                        onClick={() => openImport(transaction)}
                      >
                        <IconEdit />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        size="lg"
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
      </List>
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
