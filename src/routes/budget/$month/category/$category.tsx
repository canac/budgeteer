import { Card, Drawer, Group, Stack, Table, Text } from "@mantine/core";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { format, parse, startOfMonth } from "date-fns";
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

export default function CategoryDetailsPage() {
  const { categoryDetails } = Route.useLoaderData();
  const { month } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();

  const date = parse(month, "MM-yyyy", startOfMonth(new Date()));
  const monthFormatted = format(date, "MMMM yyyy");

  const handleGoBack = () => {
    navigate({ to: "/budget/$month", params: { month } });
  };

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

  return (
    <Drawer
      opened
      onClose={handleGoBack}
      title={
        <Text fw="bold">
          {categoryDetails.category.name} ({monthFormatted})
        </Text>
      }
      position="right"
      size="xl"
    >
      <Stack>
        <EditableName
          name={categoryDetails.category.name}
          saveName={handleSaveCategoryName}
        />

        <Group gap="md" align="stretch" w="100%" justify="center">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs" align="center">
              <Text size="sm" c="dimmed">
                Current Balance
              </Text>
              <Text
                size="xl"
                fw={700}
                c={categoryDetails.currentBalance >= 0 ? "green" : "red"}
              >
                {formatCurrency(categoryDetails.currentBalance)}
              </Text>
            </Stack>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs" align="center">
              <Text size="sm" c="dimmed">
                Starting Balance
              </Text>
              <Text size="xl" fw={700}>
                {formatCurrency(categoryDetails.startingBalance)}
              </Text>
            </Stack>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs" align="center">
              <Text size="sm" c="dimmed">
                Amount Spent
              </Text>
              <Text size="xl" fw={700} c="red">
                {formatCurrency(categoryDetails.amountSpentThisMonth)}
              </Text>
            </Stack>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs" align="center">
              <Text size="sm" c="dimmed">
                Budgeted Amount
              </Text>
              <EditableAmount
                amount={categoryDetails.budgetCategory.budgetedAmount}
                saveAmount={handleSaveBudgetedAmount}
              />
            </Stack>
          </Card>
        </Group>

        <Card shadow="sm" padding="lg" radius="md" withBorder w="100%">
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
        </Card>
      </Stack>
    </Drawer>
  );
}
