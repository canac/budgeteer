import { Button, ButtonGroup, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { EditableAmount } from "~/components/EditableAmount";
import { MantineLink } from "~/components/MantineLink";
import { createCategory } from "~/functions/createCategory";
import { getBudgetByMonth } from "~/functions/getBudgetByMonth";
import { getBudgetMonths } from "~/functions/getBudgetMonths";
import { setBudgetIncome } from "~/functions/setBudgetIncome";
import { formatCurrency } from "~/lib/formatCurrency";
import "./BudgetPage.css";

export const Route = createFileRoute("/_layout/budget/$month")({
  component: BudgetPage,
  loader: async ({ params: { month } }) => {
    const [budget, budgetMonths] = await Promise.all([
      getBudgetByMonth({ data: { month } }),
      getBudgetMonths(),
    ]);
    return { ...budget, budgetMonths };
  },
});

function BudgetPage() {
  const router = useRouter();
  const { budget, totalBudgetedAmount, budgetCategories } = Route.useLoaderData();
  const [viewMode, setViewMode] = useState<"budgeted" | "spent" | "balance">("budgeted");
  const leftToBudget = budget.income - totalBudgetedAmount;

  const handleSaveIncome = async (newIncome: number) => {
    await setBudgetIncome({
      data: { month: budget.month, income: newIncome },
    });
    await router.invalidate();
  };

  const handleCreateCategory = async () => {
    await createCategory({
      data: { budgetId: budget.id, name: "New Category" },
    });
    await router.invalidate();
  };

  return (
    <>
      <Outlet />
      <Stack className="BudgetPage" align="center">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="xs">
            <Group justify="space-between">
              <Title order={2}>Income</Title>
              <EditableAmount amount={budget.income} saveAmount={handleSaveIncome} />
            </Group>
            <Group justify="space-between">
              <Text>Left to budget</Text>
              <Text c={leftToBudget >= 0 ? "green" : "red"}>{formatCurrency(leftToBudget)}</Text>
            </Group>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="xs">
            <Group justify="space-between">
              <Title order={2}>Categories</Title>
              <ButtonGroup>
                <Button
                  variant={viewMode === "budgeted" ? "filled" : "outline"}
                  size="xs"
                  onClick={() => setViewMode("budgeted")}
                >
                  Budgeted
                </Button>
                <Button
                  variant={viewMode === "spent" ? "filled" : "outline"}
                  size="xs"
                  onClick={() => setViewMode("spent")}
                >
                  Spent
                </Button>
                <Button
                  variant={viewMode === "balance" ? "filled" : "outline"}
                  size="xs"
                  onClick={() => setViewMode("balance")}
                >
                  Balance
                </Button>
              </ButtonGroup>
            </Group>
            {budgetCategories.map((budgetCategory) => (
              <MantineLink
                key={budgetCategory.id}
                to="/budget/$month/category/$category"
                params={{
                  month: budget.month,
                  category: budgetCategory.categoryId.toString(),
                }}
                underline="never"
                c="inherit"
              >
                <Group justify="space-between">
                  <Text>{budgetCategory.name}</Text>
                  <Text>
                    {formatCurrency(
                      viewMode === "budgeted"
                        ? budgetCategory.budgetedAmount
                        : viewMode === "spent"
                          ? -budgetCategory.spent
                          : budgetCategory.balance,
                    )}
                  </Text>
                </Group>
              </MantineLink>
            ))}
            <Group justify="center">
              <Button variant="subtle" leftSection={<IconPlus />} onClick={handleCreateCategory}>
                Add Category
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </>
  );
}
