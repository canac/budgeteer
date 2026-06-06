import { ActionIcon, Button, ButtonGroup, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconPlus } from "@tabler/icons-react";
import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { addMonths, parseISO, subMonths } from "date-fns";
import { useState } from "react";
import { EditableAmount } from "~/components/EditableAmount";
import { MantineActionIconLink } from "~/components/MantineActionIconLink";
import { MantineLink } from "~/components/MantineLink";
import { createCategory } from "~/functions/createCategory";
import { getBudgetByMonth } from "~/functions/getBudgetByMonth";
import { getBudgetMonths } from "~/functions/getBudgetMonths";
import { setBudgetIncome } from "~/functions/setBudgetIncome";
import { formatCurrency, monthFormatter } from "~/lib/formatters";
import { toISOMonthString } from "~/lib/iso";
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
  head: ({ params }) => {
    const month = monthFormatter.format(parseISO(params.month));
    return { meta: [{ title: `${month} | Budgeteer` }] };
  },
});

function BudgetPage() {
  const router = useRouter();
  const { budget, totalBudgetedAmount, budgetCategories, budgetMonths } = Route.useLoaderData();
  const [viewMode, setViewMode] = useState<"budgeted" | "spent" | "balance">("budgeted");
  const leftToBudget = budget.income - totalBudgetedAmount;

  const previousMonth =
    budget.month === budgetMonths.at(-1)
      ? undefined
      : toISOMonthString(subMonths(parseISO(budget.month), 1));
  const nextMonth =
    budget.month === toISOMonthString(new Date())
      ? undefined
      : toISOMonthString(addMonths(parseISO(budget.month), 1));

  const handleSaveIncome = async (newIncome: number) => {
    await setBudgetIncome({
      data: { month: budget.month, income: newIncome },
    });
    await router.invalidate();
  };

  const handleCreateCategory = async () => {
    await createCategory({
      data: { month: budget.month, name: "New Category" },
    });
    await router.invalidate();
  };

  return (
    <>
      <Outlet />
      <Stack className="BudgetPage" align="center">
        <Group gap="xs">
          {previousMonth ? (
            <MantineActionIconLink
              to="/budget/$month"
              params={{ month: previousMonth }}
              variant="subtle"
              color="gray"
              aria-label="Previous month"
            >
              <IconChevronLeft />
            </MantineActionIconLink>
          ) : (
            <ActionIcon variant="subtle" color="gray" disabled aria-label="Previous month">
              <IconChevronLeft />
            </ActionIcon>
          )}
          <Title order={1}>{monthFormatter.format(parseISO(budget.month))}</Title>
          {nextMonth ? (
            <MantineActionIconLink
              to="/budget/$month"
              params={{ month: nextMonth }}
              variant="subtle"
              color="gray"
              aria-label="Next month"
            >
              <IconChevronRight />
            </MantineActionIconLink>
          ) : (
            <ActionIcon variant="subtle" color="gray" disabled aria-label="Next month">
              <IconChevronRight />
            </ActionIcon>
          )}
        </Group>
        <Card shadow="sm">
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

        <Card shadow="sm">
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
                          ? budgetCategory.spent
                          : budgetCategory.balance,
                    )}
                  </Text>
                </Group>
              </MantineLink>
            ))}
            <Group justify="center">
              <Button
                variant="subtle"
                leftSection={<IconPlus />}
                onClick={() => handleCreateCategory()}
              >
                Add Category
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </>
  );
}
