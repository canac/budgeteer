import { ActionIcon, Badge, type BadgeProps, Menu, Text, ThemeIcon, Tooltip } from "@mantine/core";
import {
  IconArrowsRightLeft,
  IconDots,
  IconEdit,
  IconPencilDollar,
  IconTrash,
} from "@tabler/icons-react";
import { createLink, linkOptions, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { parseISO } from "date-fns";
import { forwardRef, type ReactNode, useState } from "react";
import invariant from "tiny-invariant";
import type { getBudgetCategory } from "~/functions/getBudgetCategory";
import type { Category } from "~/prisma/client";
import {
  DeleteTransactionModal,
  type DeleteTransactionModalProps,
} from "~/components/DeleteTransactionModal";
import { List, ListRow } from "~/components/List";
import { TransferModal, type TransferModalProps } from "~/components/TransferModal";
import { getTransaction } from "~/functions/getTransaction";
import { formatCurrency, shortDateFormatter } from "~/lib/formatters";
import classes from "./TransactionList.module.css";
import { TransactionModal, type TransactionModalProps } from "./TransactionModal";

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
  const [deletingTransaction, setDeletingTransaction] = useState<
    DeleteTransactionModalProps["transaction"] | null
  >(null);
  const [editingTransaction, setEditingTransaction] = useState<
    TransactionModalProps["editingTransaction"] | null
  >(null);
  const [editingTransfer, setEditingTransfer] = useState<
    TransferModalProps["editingTransfer"] | null
  >(null);

  const handleUpdate = () => router.invalidate();

  const handleDeleteTransaction = (transaction: DeleteTransactionModalProps["transaction"]) => {
    setDeletingTransaction(transaction);
  };
  const handleEditTransaction = async (transaction: ListTransaction) => {
    const fetched = await getTransaction({
      data: { id: transaction.id },
    });

    if (fetched.transfer) {
      const { sourceCategoryId } = fetched.transfer;
      invariant(sourceCategoryId, "Leftovers transfers cannot be edited");
      setEditingTransfer({
        ...fetched.transfer,
        sourceCategoryId,
        date: fetched.date,
        description: fetched.description,
      });
    } else {
      setEditingTransaction(fetched);
    }
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
      {editingTransfer && (
        <TransferModal
          onClose={() => setEditingTransfer(null)}
          editingTransfer={editingTransfer}
          onSave={handleUpdate}
        />
      )}
      <List className={clsx(classes.root, className)}>
        {transactions.map((transaction) => {
          const income = transaction.type !== "TRANSFER" && transaction.amount >= 0;
          const uneditableMessage = uneditableReason(transaction);
          const editable = uneditableMessage === null;
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
              actions={
                <Menu position="bottom-end">
                  <Menu.Target>
                    <ActionIcon
                      variant="subtle"
                      size="lg"
                      color="gray"
                      aria-label="Transaction actions"
                    >
                      <IconDots />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Tooltip label={uneditableMessage} disabled={editable}>
                      <Menu.Item
                        leftSection={<IconEdit size={16} />}
                        disabled={!editable}
                        onClick={() => handleEditTransaction(transaction)}
                      >
                        Edit
                      </Menu.Item>
                    </Tooltip>
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={() => handleDeleteTransaction(transaction)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              }
            />
          );
        })}
        {extraRows}
      </List>
    </>
  );
}
