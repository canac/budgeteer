import {
  ActionIcon,
  AppShell,
  Button,
  Card,
  Container,
  Flex,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { format, parse, startOfMonth } from "date-fns";
import { EditableAmount } from "~/components/EditableAmount";
import { EditableName } from "~/components/EditableName";
import { createCategory } from "~/functions/createCategory";
import { getBudgetByMonth } from "~/functions/getBudgetByMonth";
import { setBudgetIncome } from "~/functions/setBudgetIncome";
import { setCategoryBalance } from "~/functions/setCategoryBalance";
import { setCategoryBudgetedAmount } from "~/functions/setCategoryBudgetedAmount";
import { setCategoryName } from "~/functions/setCategoryName";
import { formatCurrency } from "~/lib/formatCurrency";
import classes from "./$month.module.css";

export const Route = createFileRoute("/budget/$month")({
  component: BudgetPage,
  loader: async ({ params: { month } }) => {
    const budget = await getBudgetByMonth({ data: { month } });
    return { budget };
  },
});

export default function BudgetPage() {
  const router = useRouter();
  const { budget } = Route.useLoaderData();
  const leftToBudget = budget.income - budget.totalBudgetedAmount;
  const date = parse(budget.month, "MM-yyyy", startOfMonth(new Date()));
  const header = format(date, "MMMM yyyy");

  const handleSaveIncome = async (newIncome: number) => {
    await setBudgetIncome({
      data: { month: budget.month, income: newIncome },
    });
    await router.invalidate();
  };

  const handleSaveCategoryName = async (
    categoryId: number,
    newName: string,
  ) => {
    await setCategoryName({
      data: { categoryId, name: newName },
    });
    await router.invalidate();
  };

  const handleSaveCategoryBalance = async (
    categoryId: number,
    newBalance: number,
  ) => {
    await setCategoryBalance({
      data: { categoryId, targetBalance: newBalance, month: budget.month },
    });
    await router.invalidate();
  };

  const handleSaveCategoryBudgetedAmount = async (
    budgetCategoryId: number,
    newAmount: number,
  ) => {
    await setCategoryBudgetedAmount({
      data: { budgetCategoryId, budgetedAmount: newAmount },
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
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header
        style={{
          background: "linear-gradient(135deg, #51cf66ff 0%, #0d8523ff 100%)",
          color: "white",
        }}
      >
        <Container size="lg" h="100%">
          <Flex justify="space-between" align="center" h="100%">
            <Title flex={1} c="white" size="h2">
              {header}
            </Title>
            <ActionIcon variant="subtle" c="white" size="xl">
              <IconPlus size={24} />
            </ActionIcon>
          </Flex>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="lg">
          <Stack align="center">
            <Card
              className={classes.card}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
            >
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text className={classes.cardHeader}>Income</Text>
                  <EditableAmount
                    amount={budget.income}
                    saveAmount={handleSaveIncome}
                  />
                </Group>
                <Group justify="space-between">
                  <Text>Left to budget</Text>
                  <Text c={leftToBudget >= 0 ? "green" : "red"}>
                    {formatCurrency(leftToBudget)}
                  </Text>
                </Group>
              </Stack>
            </Card>

            <Card
              className={classes.card}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
            >
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text className={classes.cardHeader}>Categories</Text>
                </Group>
                {budget.budgetCategories.map((budgetCategory) => (
                  <Group key={budgetCategory.id} justify="space-between">
                    <EditableName
                      name={budgetCategory.name}
                      saveName={(newName) =>
                        handleSaveCategoryName(
                          budgetCategory.categoryId,
                          newName,
                        )
                      }
                    />
                    <EditableAmount
                      amount={budgetCategory.budgetedAmount}
                      saveAmount={(newAmount) =>
                        handleSaveCategoryBudgetedAmount(
                          budgetCategory.id,
                          newAmount,
                        )
                      }
                    />
                  </Group>
                ))}
                <Button
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                  onClick={handleCreateCategory}
                >
                  Add Category
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
