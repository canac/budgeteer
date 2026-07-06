import { ActionIcon, Card, Group, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { createFileRoute, Outlet, useMatchRoute, useRouter } from "@tanstack/react-router";
import { addMonths, parseISO, subMonths } from "date-fns";
import { EditableAmount } from "~/components/EditableAmount";
import { MantineActionIconLink } from "~/components/MantineActionIconLink";
import { getBudgetByMonth } from "~/functions/getBudgetByMonth";
import { getBudgetMonths } from "~/functions/getBudgetMonths";
import { setBudgetIncome } from "~/functions/setBudgetIncome";
import { formatCurrency, monthFormatter } from "~/lib/formatters";
import { toISOMonthString } from "~/lib/iso";
import "./BudgetPage.css";

export const Route = createFileRoute("/_layout/budget/$month")({
  component: BudgetLayout,
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

function BudgetLayout() {
  const router = useRouter();
  const { budget, totalBudgetedAmount, budgetMonths, leftoverRemaining } = Route.useLoaderData();
  const matchRoute = useMatchRoute();
  const onTransactions = !!matchRoute({ to: "/budget/$month/transactions" });
  const leftToBudget = budget.income - totalBudgetedAmount;

  const previousMonth =
    budget.month === budgetMonths.at(-1)
      ? undefined
      : toISOMonthString(subMonths(parseISO(budget.month), 1));
  const nextMonth =
    budget.month === toISOMonthString(new Date())
      ? undefined
      : toISOMonthString(addMonths(parseISO(budget.month), 1));

  const tabLink = onTransactions ? "/budget/$month/transactions" : "/budget/$month/categories";

  const handleSaveIncome = async (newIncome: number) => {
    await setBudgetIncome({
      data: { month: budget.month, income: newIncome },
    });
    await router.invalidate();
  };

  return (
    <Stack className="BudgetPage" align="center">
      <Group gap="xs">
        {previousMonth ? (
          <MantineActionIconLink
            to={tabLink}
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
            to={tabLink}
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
      <SegmentedControl
        w="100%"
        maw="36rem"
        fullWidth
        value={onTransactions ? "transactions" : "categories"}
        onChange={(value) =>
          router.navigate({
            to:
              value === "transactions"
                ? "/budget/$month/transactions"
                : "/budget/$month/categories",
            params: { month: budget.month },
          })
        }
        data={[
          { label: "Categories", value: "categories" },
          { label: "Transactions", value: "transactions" },
        ]}
      />
      <Card shadow="sm">
        <Stack gap="xs">
          <Group justify="space-between">
            <Title order={2}>Income</Title>
            <EditableAmount
              className={leftToBudget === 0 ? "positive" : undefined}
              amount={budget.income}
              saveAmount={handleSaveIncome}
            />
          </Group>
          {leftToBudget !== 0 && (
            <Group justify="space-between">
              <Text>Left to budget</Text>
              <Text c={leftToBudget >= 0 ? "green" : "red"}>{formatCurrency(leftToBudget)}</Text>
            </Group>
          )}
          <Group justify="space-between">
            <Text>Leftover</Text>
            <Text>{formatCurrency(leftoverRemaining)}</Text>
          </Group>
        </Stack>
      </Card>
      <Outlet />
    </Stack>
  );
}
