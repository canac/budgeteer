import { ActionIcon, Group, Text } from "@mantine/core";
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
import { DynamicReviewTransactionModal } from "~/components/DynamicReviewTransactionModal";
import { List, ListRow } from "~/components/List";
import { RuleBadges } from "~/components/RuleBadges";
import { formatSignedCurrency, shortDateFormatter } from "~/lib/formatters";

interface UnreviewedTransactionsProps {
  transactions: UnreviewedTransaction[];
  onAccept: (transaction: UnreviewedTransaction) => void;
  onDismissed: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onReconcile?: (transaction: UnreviewedTransaction) => void;
  onReviewed: (id: string) => void;
  onRestore?: (id: string) => void;
}

export function UnreviewedTransactions({
  transactions,
  onAccept,
  onDismissed,
  onAcknowledge,
  onReconcile,
  onReviewed,
  onRestore,
}: UnreviewedTransactionsProps) {
  const [modalOpen, { open, close }] = useDisclosure(false);
  const [reviewingTransaction, setReviewingTransaction] = useState<
    UnreviewedTransaction | undefined
  >(undefined);

  const openReview = (transaction: UnreviewedTransaction) => {
    setReviewingTransaction(transaction);
    open();
  };

  const handleReviewed = () => {
    if (reviewingTransaction) {
      onReviewed(reviewingTransaction.id);
    }
  };

  return (
    <>
      <List>
        {transactions.map((transaction) => {
          const { suggestion } = transaction;
          const vendor = suggestion?.vendorAlias ?? transaction.vendor;
          const suggested = suggestion?.outcome ?? null;
          const outcome = transaction.reviewed && suggested?.type === "dismiss" ? null : suggested;

          return (
            <ListRow
              key={transaction.id}
              className={outcome?.type === "dismiss" ? "dismiss-suggested" : undefined}
              title={
                suggestion?.vendorAlias ? (
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
              tags={<RuleBadges outcome={outcome} />}
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
                        style={{
                          visibility: outcome?.type === "categorize" ? undefined : "hidden",
                        }}
                        onClick={() => onAccept(transaction)}
                      >
                        <IconCheck />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        size="lg"
                        color="blue"
                        aria-label="Review"
                        onClick={() => openReview(transaction)}
                      >
                        <IconEdit />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        size="lg"
                        color="red"
                        aria-label="Dismiss"
                        onClick={() => onDismissed(transaction.id)}
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
      {modalOpen && reviewingTransaction && (
        <DynamicReviewTransactionModal
          onClose={close}
          onSave={handleReviewed}
          transaction={reviewingTransaction}
        />
      )}
    </>
  );
}
