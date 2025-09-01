import { ActionIcon, Box, Divider, Drawer, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { parse, startOfMonth } from "date-fns";
import { DeleteCategoryModal } from "~/components/DeleteCategoryModal";
import { EditableAmount } from "~/components/EditableAmount";
import { EditableName } from "~/components/EditableName";
import { TransactionTable } from "~/components/TransactionTable";
import { getBudgetCategory } from "~/functions/getBudgetCategory";
import { setCategoryBudgetedAmount } from "~/functions/setCategoryBudgetedAmount";
import { setCategoryName } from "~/functions/setCategoryName";
import { formatCurrency } from "~/lib/formatCurrency";

export const Route = createFileRoute("/budget/$month/category/$category")({
  component: CategoryDetailsPage,
  loader: async ({ params: { month, category } }) => {
    const categoryId = Number.parseInt(category, 10);
    if (Number.isNaN(categoryId)) {
      throw new Response("Invalid category ID", { status: 400 });
    }

    const budgetCategory = await getBudgetCategory({
      data: { month, categoryId },
    });
    return { budgetCategory };
  },
});

function CategoryDetailsPage() {
  const { budgetCategory } = Route.useLoaderData();
  const { month } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const [deleteModalOpen, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);

  const date = parse(month, "MM-yyyy", startOfMonth(new Date()));

  const handleGoBack = () => navigate({ to: "/budget/$month", params: { month } });

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

  const { budgetedAmount } = budgetCategory.budgetCategory;
  const percentageRemaining = Math.max(
    0,
    Math.round(((budgetedAmount - budgetCategory.transactionTotal) / budgetedAmount) * 100),
  );

  return (
    <Drawer
      opened
      onClose={handleGoBack}
      title={
        <Group justify="space-between" align="center" w="100%">
          <EditableName name={budgetCategory.category.name} saveName={handleSaveCategoryName} />
          <Text size="sm" fw={500} c="white" p="4px 8px" bg="black" bdrs="sm">
            {percentageRemaining}% remaining
          </Text>
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
          <Text size="md">Current Balance</Text>
          <Text size="xl" fw={700} c={budgetCategory.currentBalance >= 0 ? "green" : "red"}>
            {formatCurrency(budgetCategory.currentBalance)}
          </Text>
        </div>

        <div>
          <Text size="md">Budget Used</Text>
          <Group justify="space-between" align="center">
            <div
              style={{
                flex: 1,
                height: "8px",
                backgroundColor: "#e9ecef",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <Box
                w={`${Math.min(100, (budgetCategory.transactionTotal / budgetedAmount) * 100)}%`}
                bg={"green"}
              />
            </div>
            <Text size="sm" c="dimmed" ml="md">
              {formatCurrency(budgetCategory.transactionTotal)} of{" "}
              <EditableAmount
                amount={budgetCategory.budgetCategory.budgetedAmount}
                saveAmount={handleSaveBudgetedAmount}
              />
            </Text>
          </Group>
        </div>
        <Divider />
        <TransactionTable
          transactions={budgetCategory.transactions}
          startingBalance={budgetCategory.startingBalance}
          startingBalanceDate={date}
        />
      </Stack>
      <DeleteCategoryModal
        open={deleteModalOpen}
        onClose={() => closeDeleteModal()}
        category={budgetCategory.category}
        onDelete={() => handleGoBack()}
      />
    </Drawer>
  );
}
