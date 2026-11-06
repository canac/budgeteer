import { Badge, type BadgeProps, Text, ThemeIcon } from "@mantine/core";
import { IconArrowsRightLeft, IconPencilDollar } from "@tabler/icons-react";
import { createLink, linkOptions, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { parseISO } from "date-fns";
import { forwardRef, type ReactNode, useState } from "react";
import type { TransferModalProps } from "~/components/TransferModal";
import type { getBudgetCategory } from "~/functions/getBudgetCategory";
import type { Category } from "~/prisma/client";
import { DynamicTransferModal, preloadTransferModal } from "~/components/DynamicTransferModal";
import { List, ListRow } from "~/components/List";
import { getTransaction } from "~/functions/getTransaction";
import { formatCurrency, shortDateFormatter } from "~/lib/formatters";
import { preloadOnHover } from "~/lib/preloadOnHover";
import type { TransactionModalProps } from "./TransactionModal";
import { DynamicTransactionModal, preloadTransactionModal } from "./DynamicTransactionModal";
import classes from "./TransactionList.module.css";

type BaseTransaction = Awaited<ReturnType<typeof getBudgetCategory>>["transactions"][number];
type CategoryRef = Pick<Category, "id" | "name">;

type ListTransaction = Omit<BaseTransaction, "transfer"> & {
  transfer:
    | (NonNullable<BaseTransaction["transfer"]> & {
        sourceCategory?: CategoryRef | null;
        destinationCategory?: CategoryRef;
      })
    | null;
  transactionCategories?: CategoryRef[];
};

interface TransactionListProps {
  className?: string;
  transactions: ListTransaction[];
  extraRows?: ReactNode;
  showCategories?: boolean;
  month?: string;
}

const CategoryBadgeLink = createLink(
  forwardRef<HTMLAnchorElement, BadgeProps>((props, ref) => (
    <Badge
      className={classes.categoryBadge}
      ref={ref}
      component="a"
      variant="light"
      color="gray"
      size="lg"
      tt="none"
      {...props}
    />
  )),
);

interface CategoryBadgeProps {
  month?: string;
  category: CategoryRef;
  color?: BadgeProps["color"];
}

function CategoryBadge({ month, category, color = "gray" }: CategoryBadgeProps) {
  const link = month
    ? linkOptions({
        to: "/budget/$month/categories/$category",
        params: { month, category: category.id },
        search: true,
      })
    : linkOptions({
        to: "/category/$category",
        params: { category: category.id },
      });

  return (
    <CategoryBadgeLink {...link} color={color}>
      {category.name}
    </CategoryBadgeLink>
  );
}

function TransferSourceBadge({
  category,
  ...props
}: Omit<CategoryBadgeProps, "category"> & { category?: CategoryRef | null }) {
  if (category) {
    return <CategoryBadge category={category} {...props} />;
  }

  return (
    <Badge
      className={classes.categoryBadge}
      variant="light"
      color={props.color}
      size="lg"
      tt="none"
    >
      Leftovers
    </Badge>
  );
}

function isLeftoversTransfer(transaction: ListTransaction) {
  const { transfer } = transaction;
  return !!transfer && !transfer.sourceCategoryId;
}

type Editing = { readOnlyReason?: string } & (
  | { type: "transaction"; transaction: NonNullable<TransactionModalProps["editingTransaction"]> }
  | { type: "transfer"; transfer: NonNullable<TransferModalProps["editingTransfer"]> }
);

function uneditableReason(transaction: ListTransaction) {
  if (transaction.type === "BALANCE_ADJUSTMENT") {
    return "Cannot edit balance adjustments";
  }
  if (isLeftoversTransfer(transaction)) {
    return "Cannot edit leftovers transfers";
  }
  return null;
}

interface TransactionTypeIconProps {
  transaction: ListTransaction;
}

function TransactionTypeIcon({ transaction }: TransactionTypeIconProps) {
  if (transaction.type === "TRANSFER") {
    return (
      <ThemeIcon className={classes.transactionType}>
        <IconArrowsRightLeft />
      </ThemeIcon>
    );
  }

  if (transaction.type === "BALANCE_ADJUSTMENT") {
    return (
      <ThemeIcon className={classes.transactionType}>
        <IconPencilDollar />
      </ThemeIcon>
    );
  }

  return null;
}

function TransactionCategories({
  transaction,
  month,
}: {
  transaction: ListTransaction;
  month?: string;
}) {
  const { transfer } = transaction;
  if (
    transfer?.destinationCategory &&
    (transfer.sourceCategory || isLeftoversTransfer(transaction))
  ) {
    return (
      <>
        <TransferSourceBadge month={month} category={transfer.sourceCategory} color="orange" />
        {" → "}
        <CategoryBadge month={month} category={transfer.destinationCategory} color="teal" />
      </>
    );
  }
  return transaction.transactionCategories?.map((category) => (
    <CategoryBadge key={category.id} month={month} category={category} />
  ));
}

export function TransactionList({
  className,
  transactions,
  extraRows,
  showCategories,
  month,
}: TransactionListProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing | null>(null);

  const handleUpdate = () => router.invalidate();

  const handleEdit = async (transaction: ListTransaction) => {
    const fetched = await getTransaction({
      data: { id: transaction.id },
    });

    const readOnlyReason = uneditableReason(transaction) ?? undefined;
    setEditing(
      fetched.transfer
        ? {
            type: "transfer",
            transfer: {
              ...fetched.transfer,
              date: fetched.date,
              description: fetched.description,
              transaction: fetched,
            },
            readOnlyReason,
          }
        : { type: "transaction", transaction: fetched, readOnlyReason },
    );
  };

  return (
    <>
      {editing?.type === "transaction" && (
        <DynamicTransactionModal
          onClose={() => setEditing(null)}
          editingTransaction={editing.transaction}
          onSave={handleUpdate}
          onDelete={handleUpdate}
          readOnlyReason={editing.readOnlyReason}
        />
      )}
      {editing?.type === "transfer" && (
        <DynamicTransferModal
          onClose={() => setEditing(null)}
          editingTransfer={editing.transfer}
          onSave={handleUpdate}
          onDelete={handleUpdate}
          readOnlyReason={editing.readOnlyReason}
        />
      )}
      <List className={clsx(classes.root, className)}>
        {transactions.map((transaction) => {
          const income = transaction.type !== "TRANSFER" && transaction.amount >= 0;
          // Per-category lists show this category's split, so transfers keep their direction
          const amount = showCategories
            ? (transaction.transfer?.amount ?? transaction.amount)
            : transaction.amount;

          return (
            <ListRow
              key={transaction.id}
              icon={<TransactionTypeIcon transaction={transaction} />}
              title={transaction.vendor}
              meta={
                <>
                  {shortDateFormatter.format(parseISO(transaction.date))}
                  {transaction.description && (
                    <Text span inherit fs="italic">
                      {` · ${transaction.description}`}
                    </Text>
                  )}
                </>
              }
              tags={
                showCategories ? (
                  <TransactionCategories transaction={transaction} month={month} />
                ) : undefined
              }
              value={
                <Text className={income ? "positive" : undefined}>{formatCurrency(amount)}</Text>
              }
              {...preloadOnHover(
                transaction.transfer ? preloadTransferModal : preloadTransactionModal,
              )}
              onClick={() => handleEdit(transaction)}
            />
          );
        })}
        {extraRows}
      </List>
    </>
  );
}
