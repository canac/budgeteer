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
} from "@mantine/core";
import { parse, format, startOfMonth } from "date-fns";
import { getBudgetByMonth } from "~/functions/getBudgetByMonth";
import { setBudgetIncome } from "~/functions/setBudgetIncome";
import { setCategoryAmount } from "~/functions/setCategoryAmount";
import { setCategoryName } from "~/functions/setCategoryName";
import { setFundBalance } from "~/functions/setFundBalance";
import { setFundName } from "~/functions/setFundName";
import { EditableAmount } from "~/components/EditableAmount";
import { EditableName } from "~/components/EditableName";

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
          <Stack>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text size="lg" fw={600}>
                  Income
                </Text>
                <EditableAmount
                  amount={budget.income}
                  saveAmount={handleSaveIncome}
                />
              </Group>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
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
              </Stack>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
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
              </Stack>
            </Card>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
