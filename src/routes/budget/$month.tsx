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
import { EditableAmount } from "~/components/EditableAmount";

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
                    <Text fw={500}>{category.name}</Text>
                    <Text fw={600} size="lg">
                      ${category.amount}
                    </Text>
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
                    <Text fw={500}>{budgetFund.name}</Text>
                    <Text fw={600} size="lg">
                      ${budgetFund.fundBalance}
                    </Text>
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
