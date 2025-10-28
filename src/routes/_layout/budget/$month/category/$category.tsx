import {
  ActionIcon,
  Divider,
  Drawer,
  Group,
  Progress,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconHistory, IconTrash } from "@tabler/icons-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AddTransactionButton } from "~/components/AddTransactionButton";
import { AddTransferButton } from "~/components/AddTransferButton";
import { DynamicDeleteCategoryModal } from "~/components/DynamicDeleteCategoryModal";
import { EditableAmount } from "~/components/EditableAmount";
import { EditableName } from "~/components/EditableName";
import { MantineActionIconLink } from "~/components/MantineActionIconLink";
import { TransactionTable } from "~/components/TransactionTable";
import { getBudgetCategory } from "~/functions/getBudgetCategory";
import { setCategoryBudgetedAmount } from "~/functions/setCategoryBudgetedAmount";
import { updateCategory } from "~/functions/updateCategory";
import { useOpened } from "~/hooks/useOpened";
import { useSyncedState } from "~/hooks/useSyncedState";
import { formatCurrency } from "~/lib/formatters";
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
  const router = useRouter();
  const { close, modalProps } = useOpened({
    onClose: () => router.navigate({ to: "/budget/$month", params: { month } }),
  });
  const [deleteModalOpen, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);

  const [categoryType, setCategoryType] = useSyncedState(budgetCategory.category.type);

  const handleSaveCategoryName = async (newName: string) => {
    await updateCategory({
      data: { categoryId: budgetCategory.category.id, name: newName },
    });
    await router.invalidate();
  };

  const handleChangeType = async (value: string | null) => {
    if (!value) {
      return;
    }

    const newType = value as "SAVINGS" | "ACCUMULATING" | "NON_ACCUMULATING";
    setCategoryType(newType);
    await updateCategory({
      data: { categoryId: budgetCategory.category.id, type: newType },
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
            <IconTrash />
          </ActionIcon>
        </Group>
      }
      position="right"
      size="xl"
    >
      <Stack gap="lg">
        <Group>
          <div>
            <Title order={3}>Current Balance</Title>
            <Text size="xl" fw={700} c={budgetCategory.currentBalance >= 0 ? "green" : "red"}>
              {formatCurrency(budgetCategory.currentBalance)}
            </Text>
          </div>
          <Select
            label={<Title order={3}>Type</Title>}
            value={categoryType}
            onChange={handleChangeType}
            data={[
              { value: "SAVINGS", label: "Savings" },
              { value: "ACCUMULATING", label: "Accumulating" },
              { value: "NON_ACCUMULATING", label: "Non-Accumulating" },
            ]}
          />
        </Group>

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
            startingBalance={budgetCategory.startingBalance}
            startingBalanceMonth={month}
            onUpdate={handleUpdate}
          />
        </div>
      </Stack>
      {deleteModalOpen && (
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
