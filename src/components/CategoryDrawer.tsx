import { Divider, Drawer, Group, Progress, Stack, Text, Title } from "@mantine/core";
import { IconHistory } from "@tabler/icons-react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { parseISO, subMonths } from "date-fns";
import { AddTransactionButton } from "~/components/AddTransactionButton";
import { AddTransferButton } from "~/components/AddTransferButton";
import { CategoryHeading } from "~/components/CategoryHeading";
import { Clickable } from "~/components/Clickable";
import { EditIcon } from "~/components/EditIcon";
import { ListRow } from "~/components/List";
import { MantineActionIconLink } from "~/components/MantineActionIconLink";
import { TransactionList } from "~/components/TransactionList";
import { getBudgetCategory } from "~/functions/getBudgetCategory";
import { setCategoryBalance } from "~/functions/setCategoryBalance";
import { setCategoryBudgetedAmount } from "~/functions/setCategoryBudgetedAmount";
import { setCategoryStartingBalance } from "~/functions/setCategoryStartingBalance";
import { useEditableAmount } from "~/hooks/useEditableAmount";
import { useOpened } from "~/hooks/useOpened";
import {
  amountSignClassname,
  formatCurrency,
  monthFormatter,
  monthOnlyFormatter,
} from "~/lib/formatters";
import classes from "./CategoryDrawer.module.css";

/** Loader for a route that renders `CategoryDrawer`. */
export async function loadCategoryDrawer({
  params: { month, category },
}: {
  params: { month: string; category: string };
}) {
  const budgetCategory = await getBudgetCategory({ data: { month, categoryId: category } });
  return { budgetCategory };
}

/** Head for a route that renders `CategoryDrawer`. */
export function categoryDrawerHead({
  loaderData,
  params,
}: {
  loaderData?: Awaited<ReturnType<typeof loadCategoryDrawer>>;
  params: { month: string };
}) {
  const category = loaderData?.budgetCategory.category.name;
  const month = monthFormatter.format(parseISO(params.month));
  return { meta: [{ title: `${category ?? "Category"} - ${month} | Budgeteer` }] };
}

interface CategoryDrawerProps {
  budgetCategory: Awaited<ReturnType<typeof loadCategoryDrawer>>["budgetCategory"];
  month: string;
  category: string;
}

export function CategoryDrawer({ budgetCategory, month, category }: CategoryDrawerProps) {
  const router = useRouter();
  const navigate = useNavigate();
  const { close, modalProps } = useOpened({
    onClose: () => navigate({ to: "..", search: true }),
  });

  const handleSaveBudgetedAmount = async (newAmount: number) => {
    await setCategoryBudgetedAmount({
      data: {
        budgetCategoryId: budgetCategory.budgetCategory.id,
        budgetedAmount: newAmount,
      },
    });
    await router.invalidate();
  };

  const handleSaveBalance = async (newBalance: number) => {
    await setCategoryBalance({
      data: {
        categoryId: budgetCategory.category.id,
        month,
        targetBalance: newBalance,
      },
    });
    await router.invalidate();
  };

  const handleSaveStartingBalance = async (newBalance: number) => {
    await setCategoryStartingBalance({
      data: {
        categoryId: budgetCategory.category.id,
        month,
        targetBalance: newBalance,
      },
    });
    await router.invalidate();
  };

  const { budgetedAmount } = budgetCategory.budgetCategory;
  const percentageSpent =
    (budgetedAmount === 0 ? 1 : -budgetCategory.transactionTotal / budgetedAmount) * 100;

  const previousMonthBalance = budgetCategory.startingBalance - budgetedAmount;
  const currentBalance = useEditableAmount({
    className: clsx(classes.balance, amountSignClassname(budgetCategory.currentBalance)),
    editable: budgetCategory.category.accumulating,
    amount: budgetCategory.currentBalance,
    saveAmount: handleSaveBalance,
  });
  const budgeted = useEditableAmount({
    className: amountSignClassname(budgetedAmount),
    amount: budgetedAmount,
    saveAmount: handleSaveBudgetedAmount,
  });
  const startingBalance = useEditableAmount({
    className: amountSignClassname(previousMonthBalance),
    amount: previousMonthBalance,
    saveAmount: handleSaveStartingBalance,
  });
  const monthDate = parseISO(month);
  const transactionRows = (
    <>
      <ListRow
        className={classes.startingBalance}
        title="Budgeted this month"
        value={budgeted.field}
        onClick={budgeted.edit}
      />
      {budgetCategory.category.accumulating && (
        <ListRow
          title={`${monthOnlyFormatter.format(subMonths(monthDate, 1))} balance`}
          value={startingBalance.field}
          onClick={startingBalance.edit}
        />
      )}
    </>
  );

  return (
    <Drawer.Root {...modalProps} position="right" size="xl">
      <Drawer.Overlay />
      <Drawer.Content>
        <Drawer.Header>
          <CategoryHeading
            category={budgetCategory.category}
            deletable={budgetCategory.deletable}
            month={month}
            onSave={() => router.invalidate()}
            onDelete={close}
            renderHeading={(name) => <Drawer.Title>{name}</Drawer.Title>}
          />
          <Drawer.CloseButton />
        </Drawer.Header>
        <Drawer.Body>
          <Stack gap="lg">
            <Clickable onClick={currentBalance.edit}>
              <Text size="xs" fw="bold" c="dimmed" tt="uppercase">
                Current Balance
              </Text>
              <Group gap={0} wrap="nowrap">
                {currentBalance.field}
                {currentBalance.edit && !currentBalance.editing && <EditIcon size={28} />}
              </Group>
            </Clickable>

            <div>
              <Group justify="space-between" mb="xs">
                <Text size="sm">Spent</Text>
                <Text size="sm">
                  <Text span fw="bold">
                    {formatCurrency(-budgetCategory.transactionTotal)}
                  </Text>{" "}
                  of{" "}
                  <Text span fw="bold">
                    {formatCurrency(budgetCategory.budgetCategory.budgetedAmount)}
                  </Text>
                </Text>
              </Group>
              <Progress value={percentageSpent} color="green" flex={1} />
            </div>

            <Divider />

            <div>
              <Title order={3}>
                <Group gap="xs">
                  Transactions
                  {budgetCategory.category.deletedMonth === null && (
                    <>
                      <AddTransactionButton initialCategoryId={budgetCategory.category.id} />
                      <AddTransferButton sourceCategoryId={budgetCategory.category.id} />
                    </>
                  )}
                  <MantineActionIconLink
                    variant="subtle"
                    size="lg"
                    aria-label="Full History"
                    to="/category/$category"
                    params={{ category }}
                  >
                    <IconHistory />
                  </MantineActionIconLink>
                </Group>
              </Title>
              <TransactionList
                transactions={budgetCategory.transactions}
                extraRows={transactionRows}
              />
            </div>
          </Stack>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
}
