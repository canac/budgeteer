import { ActionIcon, Group, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconArrowBackUp,
  IconArrowsExchange,
  IconCheck,
  IconEdit,
  IconX,
} from "@tabler/icons-react";
import clsx from "clsx";
import { parseISO } from "date-fns";
import { useRef, useState } from "react";
import type { UnreviewedTransaction } from "~/functions/getUnreviewedTransactions";
import {
  DynamicReviewTransactionModal,
  preloadReviewTransactionModal,
} from "~/components/DynamicReviewTransactionModal";
import { List, ListRow } from "~/components/List";
import { RuleBadges } from "~/components/RuleBadges";
import { type SwipeAction, SwipeActions } from "~/components/SwipeActions";
import { useExitingItems } from "~/hooks/useExitingItems";
import { usePreloadWhenIdle } from "~/hooks/usePreloadWhenIdle";
import { formatSignedCurrency, shortDateFormatter } from "~/lib/formatters";
import classes from "./UnreviewedTransactions.module.css";

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
  const [renderedTransactions, onExited] = useExitingItems(transactions, "id");
  const [modalOpen, { open, close }] = useDisclosure(false);
  const [reviewingTransaction, setReviewingTransaction] = useState<
    UnreviewedTransaction | undefined
  >(undefined);
  usePreloadWhenIdle(preloadReviewTransactionModal);

  const resolveReviewClosedRef = useRef<() => void>(undefined);

  const openReview = (transaction: UnreviewedTransaction) => {
    setReviewingTransaction(transaction);
    open();
  };

  /** Resolves once the review modal closes. */
  const swipeToReview = (transaction: UnreviewedTransaction) =>
    new Promise<void>((resolve) => {
      resolveReviewClosedRef.current = resolve;
      openReview(transaction);
    });

  const handleClose = () => {
    close();
    resolveReviewClosedRef.current?.();
    resolveReviewClosedRef.current = undefined;
  };

  const handleReviewed = () => {
    if (reviewingTransaction) {
      onReviewed(reviewingTransaction.id);
    }
  };

  return (
    <>
      <List>
        {renderedTransactions.map(({ item: transaction, exiting, generation }) => {
          const { suggestion } = transaction;
          const vendor = suggestion?.vendorAlias ?? transaction.vendor;
          const suggested = suggestion?.outcome ?? null;
          const outcome = transaction.reviewed && suggested?.type === "dismiss" ? null : suggested;

          const row = (
            <ListRow
              className={outcome?.type === "dismiss" ? classes.dismissSuggested : undefined}
              title={vendor}
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

          const restore: SwipeAction | undefined = onRestore && {
            label: "Restore",
            icon: <IconArrowBackUp />,
            color: "blue",
            onTrigger: () => {
              onRestore(transaction.id);
            },
          };
          const content = transaction.changedAt ? (
            row
          ) : transaction.reviewed ? (
            <SwipeActions swipeRight={restore} swipeLeft={restore}>
              {row}
            </SwipeActions>
          ) : (
            <SwipeActions
              swipeRight={{
                label: "Dismiss",
                icon: <IconX />,
                color: "red",
                onTrigger: () => {
                  onDismissed(transaction.id);
                },
              }}
              swipeLeft={
                outcome?.type === "categorize"
                  ? {
                      label: "Accept",
                      icon: <IconCheck />,
                      color: "green",
                      onTrigger: () => {
                        onAccept(transaction);
                      },
                    }
                  : {
                      label: "Review",
                      icon: <IconEdit />,
                      color: "blue",
                      onTrigger: () => swipeToReview(transaction),
                    }
              }
            >
              {row}
            </SwipeActions>
          );

          return (
            <div
              key={`${transaction.id}:${generation}`}
              className={clsx(classes.item, exiting && classes.exiting)}
              data-exiting={exiting || undefined}
              inert={exiting}
              onAnimationEnd={(event) => {
                if (exiting && event.target === event.currentTarget) {
                  onExited(transaction.id);
                }
              }}
            >
              <div className={classes.itemContent}>{content}</div>
            </div>
          );
        })}
      </List>
      {modalOpen && reviewingTransaction && (
        <DynamicReviewTransactionModal
          onClose={handleClose}
          onSave={handleReviewed}
          transaction={reviewingTransaction}
        />
      )}
    </>
  );
}
