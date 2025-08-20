import { createFileRoute, useRouter } from "@tanstack/react-router";
import { IconPlus } from "@tabler/icons-react";
import {
  AppShell,
  Container,
  Group,
  Stack,
  Title,
  Text,
  Card,
  Flex,
  ActionIcon,
  Button,
} from "@mantine/core";
import { parse, format, startOfMonth } from "date-fns";
import { getBudgetByMonth } from "~/functions/getBudgetByMonth";
import { setBudgetIncome } from "~/functions/setBudgetIncome";
import { setCategoryAmount } from "~/functions/setCategoryAmount";
import { setCategoryName } from "~/functions/setCategoryName";
import { setFundBalance } from "~/functions/setFundBalance";
import { setFundName } from "~/functions/setFundName";
import { createCategory } from "~/functions/createCategory";
import { createFund } from "~/functions/createFund";
import { EditableAmount } from "~/components/EditableAmount";
import { EditableName } from "~/components/EditableName";
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

  const handleSaveCategoryAmount = async (
    categoryId: number,
    newAmount: number,
  ) => {
    await setCategoryAmount({
      data: { categoryId, amount: newAmount },
    });
    await router.invalidate();
  };

  const handleSaveFundBalance = async (fundId: number, newBalance: number) => {
    await setFundBalance({
      data: { fundId, targetBalance: newBalance, month: budget.month },
    });
    await router.invalidate();
  };

  const handleSaveFundName = async (fundId: number, newName: string) => {
    await setFundName({
      data: { fundId, name: newName },
    });
    await router.invalidate();
  };

  const handleCreateCategory = async () => {
    await createCategory({
      data: { budgetId: budget.id, name: "New Category" },
    });
    await router.invalidate();
  };

  const handleCreateFund = async () => {
    await createFund({
      data: { budgetId: budget.id, name: "New Fund" },
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
              <Group justify="space-between" mb="xs">
                <Text size="lg" fw={600}>
                  Income
                </Text>
                <EditableAmount
                  amount={budget.income}
                  saveAmount={handleSaveIncome}
                />
              </Group>
              <Stack gap="xs">
                <Group justify="space-between" mb="xs">
                  <Text>Left to budget</Text>
                  <Text c={leftToBudget >= 0 ? "green" : "red"}>
                    ${leftToBudget}
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
              <Group justify="space-between" mb="xs">
                <Text size="lg" fw={600}>
                  Categories
                </Text>
              </Group>
              <Stack gap="xs">
                {budget.categories.map((category) => (
                  <Group key={category.id} justify="space-between">
                    <EditableName
                      name={category.name}
                      saveName={(newName) =>
                        handleSaveCategoryName(category.id, newName)
                      }
                    />
                    <EditableAmount
                      amount={category.amount}
                      saveAmount={(newAmount) =>
                        handleSaveCategoryAmount(category.id, newAmount)
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

            <Card
              className={classes.card}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
            >
              <Group justify="space-between" mb="xs">
                <Text size="lg" fw={600}>
                  Funds
                </Text>
              </Group>
              <Stack gap="xs">
                {budget.budgetFunds.map((budgetFund) => (
                  <Group key={budgetFund.id} justify="space-between">
                    <EditableName
                      name={budgetFund.name}
                      saveName={(newName) =>
                        handleSaveFundName(budgetFund.fundId, newName)
                      }
                    />
                    <EditableAmount
                      amount={budgetFund.fundBalance}
                      saveAmount={(newBalance) =>
                        handleSaveFundBalance(budgetFund.fundId, newBalance)
                      }
                    />
                  </Group>
                ))}
                <Button
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                  onClick={handleCreateFund}
                >
                  Add Fund
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
