import {
  ActionIcon,
  Divider,
  Drawer,
  Group,
  Progress,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconHistory, IconTrash } from "@tabler/icons-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { parseISO, subMonths } from "date-fns";
import { AddTransactionButton } from "~/components/AddTransactionButton";
import { AddTransferButton } from "~/components/AddTransferButton";
import { CategoryType } from "~/components/CategoryType";
import { CategoryTypeIcons } from "~/components/CategoryTypeIcons";
import { DynamicDeleteCategoryModal } from "~/components/DynamicDeleteCategoryModal";
import { EditableAmount } from "~/components/EditableAmount";
import { EditableName } from "~/components/EditableName";
import { MantineActionIconLink } from "~/components/MantineActionIconLink";
import { TransactionTable } from "~/components/TransactionTable";
import { getBudgetCategory } from "~/functions/getBudgetCategory";
import { setCategoryBalance } from "~/functions/setCategoryBalance";
import { setCategoryBudgetedAmount } from "~/functions/setCategoryBudgetedAmount";
import { setCategoryStartingBalance } from "~/functions/setCategoryStartingBalance";
import { updateCategory } from "~/functions/updateCategory";
import { useOpened } from "~/hooks/useOpened";
import { useSyncedState } from "~/hooks/useSyncedState";
import {
  formatCurrency,
  monthFormatter,
  monthOnlyFormatter,
  shortDateFormatter,
} from "~/lib/formatters";
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
  const [deleteModalOpen, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);

  const [accumulating, setAccumulating] = useSyncedState(budgetCategory.category.accumulating);
  const [flexible, setFlexible] = useSyncedState(budgetCategory.category.flexible);

  const handleSaveCategoryName = async (newName: string) => {
    await updateCategory({
      data: { categoryId: budgetCategory.category.id, name: newName },
    });
    await router.invalidate();
  };

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
      <Table.Tr className="starting-balance">
        <Table.Td>{shortDateFormatter.format(monthDate)}</Table.Td>
        <Table.Td>Budgeted this month</Table.Td>
        <Table.Td />
        <Table.Td ta="right">
          <EditableAmount
            className={amountSignClassname(budgetedAmount)}
            amount={budgetedAmount}
            saveAmount={handleSaveBudgetedAmount}
          />
        </Table.Td>
        <Table.Td />
      </Table.Tr>
      {budgetCategory.category.accumulating && (
        <Table.Tr>
          <Table.Td>{shortDateFormatter.format(monthDate)}</Table.Td>
          <Table.Td>{monthOnlyFormatter.format(subMonths(monthDate, 1))} balance</Table.Td>
          <Table.Td />
          <Table.Td ta="right">
            <EditableAmount
              className={amountSignClassname(previousMonthBalance)}
              amount={previousMonthBalance}
              saveAmount={handleSaveStartingBalance}
            />
          </Table.Td>
          <Table.Td />
        </Table.Tr>
      )}
    </>
  );

  return (
    <Drawer
      className="CategoryDetailsPage"
      {...modalProps}
      title={
        <Group>
          <EditableName name={budgetCategory.category.name} saveName={handleSaveCategoryName} />
          <CategoryTypeIcons accumulating={accumulating} flexible={flexible} size={20} />
          <Tooltip
            label={!budgetCategory.deletable.valid && budgetCategory.deletable.message}
            disabled={budgetCategory.deletable.valid}
          >
            <ActionIcon
              color="red"
              onClick={() => openDeleteModal()}
              disabled={!budgetCategory.deletable.valid}
              title="Delete category"
              size="md"
            >
              <IconTrash />
            </ActionIcon>
          </Tooltip>
        </Group>
      }
      position="right"
      size="xl"
    >
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="xs" fw="bold" c="dimmed" tt="uppercase">
              Current Balance
            </Text>
            <EditableAmount
              className={clsx(["balance", amountSignClassname(budgetCategory.currentBalance)])}
              editable={accumulating}
              amount={budgetCategory.currentBalance}
              saveAmount={handleSaveBalance}
            />
          </div>
          <CategoryType
            categoryId={budgetCategory.category.id}
            accumulating={budgetCategory.category.accumulating}
            flexible={budgetCategory.category.flexible}
            onChange={(values) => {
              setAccumulating(values.accumulating);
              setFlexible(values.flexible);
            }}
          />
        </Group>

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
          <TransactionTable
            transactions={budgetCategory.transactions}
            extraRows={transactionRows}
          />
        </div>
      </Stack>
      {deleteModalOpen && budgetCategory.deletable.valid && (
        <DynamicDeleteCategoryModal
          onClose={() => closeDeleteModal()}
          category={budgetCategory.category}
          month={month}
          onDelete={close}
        />
      )}
    </Drawer>
  );
}
