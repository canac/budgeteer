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
import { IconArrowsExchange, IconList, IconLogout, IconPlus } from "@tabler/icons-react";
import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { BudgetMonthSelector } from "~/components/BudgetMonthSelector";
import { DynamicNewTransferModal } from "~/components/DynamicNewTransferModal";
import { DynamicTransactionModal } from "~/components/DynamicTransactionModal";
import { EditableAmount } from "~/components/EditableAmount";
import { MantineLink } from "~/components/MantineLink";
import { createCategory } from "~/functions/createCategory";
import { getBudgetByMonth } from "~/functions/getBudgetByMonth";
import { getBudgetMonths } from "~/functions/getBudgetMonths";
import { logout } from "~/functions/logout";
import { setBudgetIncome } from "~/functions/setBudgetIncome";
import { formatCurrency } from "~/lib/formatCurrency";
import "./BudgetPage.css";

export const Route = createFileRoute("/budget/$month")({
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
  const { budget, month, totalBudgetedAmount, budgetCategories, budgetMonths } =
    Route.useLoaderData();
  const [viewMode, setViewMode] = useState<"budgeted" | "spent" | "balance">("budgeted");
  const [transactionOpened, { open: openTransaction, close: closeTransaction }] =
    useDisclosure(false);
  const [transferOpened, { open: openTransfer, close: closeTransfer }] = useDisclosure(false);
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

  const handleUpdate = async () => {
    await router.invalidate();
  };

  const handleViewTransactions = () => {
    router.navigate({
      to: "/budget/$month/transactions",
      params: { month: budget.month },
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {transactionOpened && (
        <DynamicTransactionModal onClose={closeTransaction} onSave={handleUpdate} />
      )}
      {transferOpened && <DynamicNewTransferModal onClose={closeTransfer} onSave={handleUpdate} />}
      <AppShell className="BudgetPage" header={{ height: 60 }} padding="md">
        <AppShell.Header
          style={{
            background: "linear-gradient(135deg, #51cf66ff 0%, #0d8523ff 100%)",
            color: "white",
          }}
        >
          <Container size="lg" h="100%">
            <Flex justify="space-between" align="center" h="100%">
              <BudgetMonthSelector budgetMonths={budgetMonths} currentMonth={month} />
              <Group gap="xs">
                <ActionIcon variant="subtle" c="white" size="xl" onClick={handleViewTransactions}>
                  <IconList size={24} />
                </ActionIcon>
                <ActionIcon variant="subtle" c="white" size="xl" onClick={openTransfer}>
                  <IconArrowsExchange size={24} />
                </ActionIcon>
                <ActionIcon variant="subtle" c="white" size="xl" onClick={openTransaction}>
                  <IconPlus size={24} />
                </ActionIcon>
                <ActionIcon variant="subtle" c="white" size="xl" onClick={handleLogout}>
                  <IconLogout size={24} />
                </ActionIcon>
              </Group>
            </Flex>
          </Container>
        </AppShell.Header>

        <AppShell.Main>
          <Container size="lg">
            <Outlet />
            <Stack align="center">
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Title order={2}>Income</Title>
                    <EditableAmount amount={budget.income} saveAmount={handleSaveIncome} />
                  </Group>
                  <Group justify="space-between">
                    <Text>Left to budget</Text>
                    <Text c={leftToBudget >= 0 ? "green" : "red"}>
                      {formatCurrency(leftToBudget)}
                    </Text>
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
                    <Button
                      variant="subtle"
                      leftSection={<IconPlus />}
                      onClick={handleCreateCategory}
                    >
                      Add Category
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </Stack>
          </Container>
        </AppShell.Main>
      </AppShell>
    </>
  );
}
