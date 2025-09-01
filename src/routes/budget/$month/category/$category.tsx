import {
  ActionIcon,
  Box,
  Divider,
  Drawer,
  Group,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { format, parse, startOfMonth } from "date-fns";
import { DeleteCategoryModal } from "~/components/DeleteCategoryModal";
import { EditableAmount } from "~/components/EditableAmount";
import { EditableName } from "~/components/EditableName";
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

  const handleGoBack = () =>
    navigate({ to: "/budget/$month", params: { month } });

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
          <EditableName
            name={categoryDetails.category.name}
            saveName={handleSaveCategoryName}
          />
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
          <Text
            size="xl"
            fw={700}
            c={categoryDetails.currentBalance >= 0 ? "green" : "red"}
          >
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
              <Box
                w={`${Math.min(100, (budgetUsed / budgetedAmount) * 100)}%`}
                bg={"green"}
              />
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

        <Stack gap="md">
          <Text fw={500} size="lg">
            Transactions
          </Text>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Vendor</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th ta="right">Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {categoryDetails.transactions.map((transaction) => (
                <Table.Tr key={transaction.id}>
                  <Table.Td>
                    {format(new Date(transaction.date), "MMM dd")}
                  </Table.Td>
                  <Table.Td>{transaction.vendor}</Table.Td>
                  <Table.Td>{transaction.description}</Table.Td>
                  <Table.Td
                    ta="right"
                    c={transaction.amount < 0 ? undefined : "green"}
                  >
                    {formatCurrency(transaction.amount)}
                  </Table.Td>
                </Table.Tr>
              ))}
              <Table.Tr style={{ borderTop: "2px solid" }}>
                <Table.Td>{format(date, "MMM dd")}</Table.Td>
                <Table.Td>Starting Balance</Table.Td>
                <Table.Td></Table.Td>
                <Table.Td
                  ta="right"
                  c={categoryDetails.startingBalance < 0 ? "red" : "green"}
                >
                  {formatCurrency(categoryDetails.startingBalance)}
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
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
