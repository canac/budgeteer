import { Divider, Drawer, Group, Progress, Stack, Text, Title } from "@mantine/core";
import { IconHistory } from "@tabler/icons-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { parseISO, subMonths } from "date-fns";
import { AddTransactionButton } from "~/components/AddTransactionButton";
import { AddTransferButton } from "~/components/AddTransferButton";
import { CategoryHeaderActions } from "~/components/CategoryHeaderActions";
import { CategoryTypeIcons } from "~/components/CategoryTypeIcons";
import { EditableAmount } from "~/components/EditableAmount";
import { MantineActionIconLink } from "~/components/MantineActionIconLink";
import { MantineLink } from "~/components/MantineLink";
import { TransactionList, TransactionRow } from "~/components/TransactionList";
import { getBudgetCategory } from "~/functions/getBudgetCategory";
import { setCategoryBalance } from "~/functions/setCategoryBalance";
import { setCategoryBudgetedAmount } from "~/functions/setCategoryBudgetedAmount";
import { setCategoryStartingBalance } from "~/functions/setCategoryStartingBalance";
import { useOpened } from "~/hooks/useOpened";
import { formatCurrency, monthFormatter, monthOnlyFormatter } from "~/lib/formatters";
import "./CategoryDetailsPage.css";

export const Route = createFileRoute("/_layout/budget/$month/category/$category")({
  component: CategoryDetailsPage,
  loader: async ({ params: { month, category } }) => {
    const budgetCategory = await getBudgetCategory({
      data: { month, categoryId: category },
    });
    return { budgetCategory };
  },
  head: ({ loaderData, params }) => {
    const category = loaderData?.budgetCategory.category.name;
    const month = monthFormatter.format(parseISO(params.month));
    return {
      meta: [{ title: `${category ?? "Category"} - ${month} | Budgeteer` }],
    };
  },
});

/** Get the `positive` or `negative` className for an amount */
const amountSignClassname = (amount: number): string => (amount >= 0 ? "positive" : "negative");

function CategoryDetailsPage() {
  const { budgetCategory } = Route.useLoaderData();
  const { month, category } = Route.useParams();
  const router = useRouter();
  const { close, modalProps } = useOpened({
    onClose: () => router.navigate({ to: "/budget/$month", params: { month } }),
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
  const monthDate = parseISO(month);
  const transactionRows = (
    <>
      <TransactionRow
        className="starting-balance"
        title="Budgeted this month"
        amount={
          <EditableAmount
            className={amountSignClassname(budgetedAmount)}
            amount={budgetedAmount}
            saveAmount={handleSaveBudgetedAmount}
          />
        }
      />
      {budgetCategory.category.accumulating && (
        <TransactionRow
          title={`${monthOnlyFormatter.format(subMonths(monthDate, 1))} balance`}
          amount={
            <EditableAmount
              className={amountSignClassname(previousMonthBalance)}
              amount={previousMonthBalance}
              saveAmount={handleSaveStartingBalance}
            />
          }
        />
      )}
    </>
  );

  return (
    <Drawer
      className="CategoryDetailsPage"
      {...modalProps}
      title={
        <Group>
          <MantineLink
            fw="bold"
            fz="2rem"
            c="inherit"
            underline="never"
            to="/category/$category"
            params={{ category }}
          >
            {budgetCategory.category.name}
          </MantineLink>
          <CategoryTypeIcons category={budgetCategory.category} size={20} />
          <CategoryHeaderActions
            category={budgetCategory.category}
            deletable={budgetCategory.deletable}
            month={month}
            size="md"
            onSave={() => router.invalidate()}
            onDelete={close}
          />
        </Group>
      }
      position="right"
      size="xl"
    >
      <Stack gap="lg">
        <div>
          <Text size="xs" fw="bold" c="dimmed" tt="uppercase">
            Current Balance
          </Text>
          <EditableAmount
            className={clsx(["balance", amountSignClassname(budgetCategory.currentBalance)])}
            editable={budgetCategory.category.accumulating}
            amount={budgetCategory.currentBalance}
            saveAmount={handleSaveBalance}
          />
        </div>

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
            <Group align="center" gap="xs">
              Transactions
              {budgetCategory.category.deletedMonth === null && (
                <>
                  <AddTransactionButton initialCategoryId={budgetCategory.category.id} />
                  <AddTransferButton sourceCategoryId={budgetCategory.category.id} />
                </>
              )}
              <MantineActionIconLink
                variant="subtle"
                size="md"
                aria-label="Full History"
                to="/category/$category"
                params={{ category }}
              >
                <IconHistory />
              </MantineActionIconLink>
            </Group>
          </Title>
          <TransactionList transactions={budgetCategory.transactions} extraRows={transactionRows} />
        </div>
      </Stack>
    </Drawer>
  );
}
