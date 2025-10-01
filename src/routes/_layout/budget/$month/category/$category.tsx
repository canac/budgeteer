import { ActionIcon, Divider, Drawer, Group, Progress, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconHistory, IconTrash } from "@tabler/icons-react";
import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { AddTransactionButton } from "~/components/AddTransactionButton";
import { AddTransferButton } from "~/components/AddTransferButton";
import { DynamicDeleteCategoryModal } from "~/components/DynamicDeleteCategoryModal";
import { EditableAmount } from "~/components/EditableAmount";
import { EditableName } from "~/components/EditableName";
import { MantineActionIconLink } from "~/components/MantineActionIconLink";
import { TransactionTable } from "~/components/TransactionTable";
import { getBudgetCategory } from "~/functions/getBudgetCategory";
import { setCategoryBudgetedAmount } from "~/functions/setCategoryBudgetedAmount";
import { setCategoryName } from "~/functions/setCategoryName";
import { useOpened } from "~/hooks/useOpened";
import { formatCurrency } from "~/lib/formatCurrency";
import "./CategoryDetailsPage.css";

export const Route = createFileRoute("/_layout/budget/$month/category/$category")({
  component: CategoryDetailsPage,
  loader: async ({ params: { month, category } }) => {
    const budgetCategory = await getBudgetCategory({
      data: { month, categoryId: category },
    });
    return { budgetCategory };
  },
});

function CategoryDetailsPage() {
  const { budgetCategory } = Route.useLoaderData();
  const { month, category } = Route.useParams();
  const { month: monthDate } = useLoaderData({ from: "/_layout/budget/$month" });
  const router = useRouter();
  const { close, modalProps } = useOpened({
    onClose: () => router.navigate({ to: "/budget/$month", params: { month } }),
  });
  const [deleteModalOpen, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);

  const handleSaveCategoryName = async (newName: string) => {
    await setCategoryName({
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

  const handleUpdate = async () => {
    await router.invalidate();
  };

  const { budgetedAmount } = budgetCategory.budgetCategory;

  return (
    <Drawer
      className="CategoryDetailsPage"
      {...modalProps}
      title={
        <Group>
          <EditableName name={budgetCategory.category.name} saveName={handleSaveCategoryName} />
          <ActionIcon
            color="red"
            onClick={() => openDeleteModal()}
            title="Delete category"
            size="md"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      }
      position="right"
      size="xl"
    >
      <Stack gap="lg">
        <div>
          <Title order={3}>Current Balance</Title>
          <Text size="xl" fw={700} c={budgetCategory.currentBalance >= 0 ? "green" : "red"}>
            {formatCurrency(budgetCategory.currentBalance)}
          </Text>
        </div>

        <div>
          <Group justify="space-between">
            <Title order={3}>Spent</Title>
            <Text component="div" size="sm" c="dimmed">
              {formatCurrency(-budgetCategory.transactionTotal)} of{" "}
              <EditableAmount
                amount={budgetCategory.budgetCategory.budgetedAmount}
                saveAmount={handleSaveBudgetedAmount}
              />
            </Text>
          </Group>
          <Progress
            value={(-budgetCategory.transactionTotal / budgetedAmount) * 100}
            color="green"
            flex={1}
          />
        </div>

        <Divider />

        <div>
          <Title order={3}>
            <Group align="center" gap="xs">
              Transactions
              <AddTransactionButton initialCategoryId={budgetCategory.category.id} />
              <AddTransferButton sourceCategoryId={budgetCategory.category.id} />
              <MantineActionIconLink
                variant="subtle"
                size="md"
                aria-label="Full History"
                to="/category/$category"
                params={{ category }}
              >
                <IconHistory size={16} />
              </MantineActionIconLink>
            </Group>
          </Title>
          <TransactionTable
            transactions={budgetCategory.transactions}
            startingBalance={budgetCategory.startingBalance}
            startingBalanceDate={monthDate}
            onUpdate={handleUpdate}
          />
        </div>
      </Stack>
      {deleteModalOpen && (
        <DynamicDeleteCategoryModal
          onClose={() => closeDeleteModal()}
          category={budgetCategory.category}
          onDelete={close}
        />
      )}
    </Drawer>
  );
}
