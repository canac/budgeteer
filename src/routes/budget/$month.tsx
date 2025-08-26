import {
  ActionIcon,
  AppShell,
  Button,
  ButtonGroup,
  Card,
  Container,
  Flex,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { format, parse, startOfMonth } from "date-fns";
import { useState } from "react";
import { EditableAmount } from "~/components/EditableAmount";
import { EditableName } from "~/components/EditableName";
import { NewTransactionModal } from "~/components/NewTransactionModal";
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
  const [viewMode, setViewMode] = useState<"budgeted" | "balance">("budgeted");
  const [opened, { open, close }] = useDisclosure(false);
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

  const handleTransactionCreated = async () => {
    await router.invalidate();
  };

  const categories = budget.budgetCategories.map((budgetCategory) => ({
    id: budgetCategory.categoryId,
    name: budgetCategory.name,
    currentBalance: budgetCategory.balance,
  }));

  return (
    <>
      <NewTransactionModal
        opened={opened}
        onClose={close}
        categories={categories}
        onTransactionCreated={handleTransactionCreated}
      />
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
              <ActionIcon variant="subtle" c="white" size="xl" onClick={open}>
                <IconPlus size={24} />
              </ActionIcon>
            </Flex>
          </Container>
        </AppShell.Header>

        <AppShell.Main>
          <Container size="lg">
            {}
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
                    <ButtonGroup>
                      <Button
                        variant={viewMode === "budgeted" ? "filled" : "outline"}
                        size="xs"
                        onClick={() => setViewMode("budgeted")}
                      >
                        Budgeted
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
                        amount={
                          viewMode === "budgeted"
                            ? budgetCategory.budgetedAmount
                            : budgetCategory.balance
                        }
                        saveAmount={(newAmount) =>
                          viewMode === "budgeted"
                            ? handleSaveCategoryBudgetedAmount(
                                budgetCategory.id,
                                newAmount,
                              )
                            : handleSaveCategoryBalance(
                                budgetCategory.categoryId,
                                newAmount,
                              )
                        }
                      />
                    </Group>
                  ))}
                  <Button
                    variant="light"
                    leftSection={<IconPlus />}
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
    </>
  );
}
