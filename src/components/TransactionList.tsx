import { ActionIcon, Badge, type BadgeProps, Menu, Text, ThemeIcon } from "@mantine/core";
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
import type { getBudgetCategory } from "~/functions/getBudgetCategory";
import type { Category } from "~/prisma/client";
import {
  DeleteTransactionModal,
  type DeleteTransactionModalProps,
} from "~/components/DeleteTransactionModal";
import { getTransaction } from "~/functions/getTransaction";
import { formatCurrency, shortDateFormatter } from "~/lib/formatters";
import "./TransactionList.css";
import { TransactionModal, type TransactionModalProps } from "./TransactionModal";

type BaseTransaction = Awaited<ReturnType<typeof getBudgetCategory>>["transactions"][number];
type CategoryRef = Pick<Category, "id" | "name">;

type ListTransaction = Omit<BaseTransaction, "transfer"> & {
  transfer:
    | (NonNullable<BaseTransaction["transfer"]> & {
        sourceCategory?: CategoryRef;
        destinationCategory?: CategoryRef;
      })
    | null;
  transactionCategories?: CategoryRef[];
};

interface TransactionListProps {
  transactions: ListTransaction[];
  extraRows?: ReactNode;
  showCategories?: boolean;
  month?: string;
}

const CategoryBadgeLink = createLink(
  forwardRef<HTMLAnchorElement, BadgeProps>((props, ref) => (
    <Badge
      className="category-badge"
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

interface TransactionTypeIconProps {
  transaction: ListTransaction;
}

function TransactionTypeIcon({ transaction }: TransactionTypeIconProps) {
  if (transaction.type === "TRANSFER") {
    return (
      <ThemeIcon className="transaction-type">
        <IconArrowsRightLeft />
      </ThemeIcon>
    );
  }

  if (transaction.type === "BALANCE_ADJUSTMENT") {
    return (
      <ThemeIcon className="transaction-type">
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
  if (transaction.transfer?.sourceCategory && transaction.transfer.destinationCategory) {
    return (
      <>
        <CategoryBadge
          month={month}
          category={transaction.transfer.sourceCategory}
          color="orange"
        />
        {" → "}
        <CategoryBadge
          month={month}
          category={transaction.transfer.destinationCategory}
          color="teal"
        />
      </>
    );
  }
  return transaction.transactionCategories?.map((category) => (
    <CategoryBadge key={category.id} month={month} category={category} />
  ));
}

export interface TransactionRowProps {
  icon?: ReactNode;
  title: ReactNode;
  date?: Date;
  description?: ReactNode;
  categories?: ReactNode;
  amount: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Shared row layout used by the transaction list and the category page's extra rows. */
export function TransactionRow({
  icon,
  title,
  date,
  description,
  categories,
  amount,
  actions,
  className,
}: TransactionRowProps) {
  const hasBottom = Boolean(date) || Boolean(description) || Boolean(categories);

  return (
    <div className={clsx("transaction-row", className)}>
      <div className="cell-vendor">
        <Text component="span" fw="bold" lineClamp={1}>
          {title}
        </Text>
        {icon}
      </div>
      <div className="cell-amount">{amount}</div>
      <div className="cell-menu">{actions}</div>
      {hasBottom && (
        <div className="cell-bottom">
          {(Boolean(date) || Boolean(description)) && (
            <span className="bottom-meta">
              {date && (
                <Text component="span" c="dimmed" size="sm">
                  {shortDateFormatter.format(date)}
                </Text>
              )}
              {description && (
                <Text component="span" c="dimmed" size="sm" fs="italic">
                  {date ? " · " : ""}
                  {description}
                </Text>
              )}
            </span>
          )}
          {categories}
        </div>
      )}
    </div>
  );
}

export function TransactionList({
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

  const handleUpdate = () => router.invalidate();

  const handleDeleteTransaction = (transaction: DeleteTransactionModalProps["transaction"]) => {
    setDeletingTransaction(transaction);
  };
  const handleEditTransaction = async (transaction: ListTransaction) => {
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
      <div className="TransactionList">
        {transactions.map((transaction) => {
          const income = transaction.type !== "TRANSFER" && transaction.amount >= 0;

          return (
            <TransactionRow
              key={transaction.id}
              icon={<TransactionTypeIcon transaction={transaction} />}
              title={transaction.vendor}
              date={parseISO(transaction.date)}
              description={transaction.description}
              categories={
                showCategories ? (
                  <TransactionCategories transaction={transaction} month={month} />
                ) : undefined
              }
              amount={
                <Text className={income ? "positive" : undefined} fw="bold">
                  {formatCurrency(transaction.transfer?.amount ?? transaction.amount)}
                </Text>
              }
              actions={
                <Menu position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray" aria-label="Transaction actions">
                      <IconDots />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconEdit size={16} />}
                      disabled={transaction.type !== "TRANSACTION"}
                      onClick={() => handleEditTransaction(transaction)}
                    >
                      Edit
                    </Menu.Item>
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
      </div>
    </>
  );
}
