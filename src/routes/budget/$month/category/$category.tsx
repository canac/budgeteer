import { ActionIcon, Box, Divider, Drawer, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { parse, startOfMonth } from "date-fns";
import { DeleteCategoryModal } from "~/components/DeleteCategoryModal";
import { EditableAmount } from "~/components/EditableAmount";
import { EditableName } from "~/components/EditableName";
import { TransactionTable } from "~/components/TransactionTable";
import { getCategoryDetails } from "~/functions/getCategoryDetails";
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

    const categoryDetails = await getCategoryDetails({
      data: { month, categoryId },
    });
    return { categoryDetails };
  },
});

function CategoryDetailsPage() {
  const { categoryDetails } = Route.useLoaderData();
  const { month } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const [deleteModalOpen, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);

  const date = parse(month, "MM-yyyy", startOfMonth(new Date()));

  const handleGoBack = () => navigate({ to: "/budget/$month", params: { month } });

  const handleSaveCategoryName = async (newName: string) => {
    await setCategoryName({
      data: { categoryId: categoryDetails.category.id, name: newName },
    });
    await router.invalidate();
  };

  const handleSaveBudgetedAmount = async (newAmount: number) => {
    await setCategoryBudgetedAmount({
      data: {
        budgetCategoryId: categoryDetails.budgetCategory.id,
        budgetedAmount: newAmount,
      },
    });
    await router.invalidate();
  };

  const budgetUsed = Math.abs(categoryDetails.amountSpentThisMonth);
  const { budgetedAmount } = categoryDetails.budgetCategory;
  const percentageRemaining = Math.max(
    0,
    Math.round(((budgetedAmount - budgetUsed) / budgetedAmount) * 100),
  );

  return (
    <Drawer
      opened
      onClose={handleGoBack}
      title={
        <Group justify="space-between" align="center" w="100%">
          <EditableName name={categoryDetails.category.name} saveName={handleSaveCategoryName} />
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
          <Text size="xl" fw={700} c={categoryDetails.currentBalance >= 0 ? "green" : "red"}>
            {formatCurrency(categoryDetails.currentBalance)}
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
              <Box w={`${Math.min(100, (budgetUsed / budgetedAmount) * 100)}%`} bg={"green"} />
            </div>
            <Text size="sm" c="dimmed" ml="md">
              {formatCurrency(budgetUsed)} of{" "}
              <EditableAmount
                amount={categoryDetails.budgetCategory.budgetedAmount}
                saveAmount={handleSaveBudgetedAmount}
              />
            </Text>
          </Group>
        </div>
        <Divider />
        <TransactionTable
          transactions={categoryDetails.transactions}
          startingBalance={categoryDetails.startingBalance}
          startingBalanceDate={date}
        />
      </Stack>
      <DeleteCategoryModal
        open={deleteModalOpen}
        onClose={() => closeDeleteModal()}
        category={categoryDetails.category}
        onDelete={() => handleGoBack()}
      />
    </Drawer>
  );
}
