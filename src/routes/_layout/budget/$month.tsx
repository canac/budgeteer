import { ActionIcon, Card, Group, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconFilter } from "@tabler/icons-react";
import {
  createFileRoute,
  Outlet,
  useMatchRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { addMonths, parseISO, subMonths } from "date-fns";
import { boolean, catch as zCatch, object, optional } from "zod/mini";
import { EditableAmount } from "~/components/EditableAmount";
import { MantineActionIconLink } from "~/components/MantineActionIconLink";
import { getBudgetByMonth } from "~/functions/getBudgetByMonth";
import { getBudgetMonths } from "~/functions/getBudgetMonths";
import { setBudgetIncome } from "~/functions/setBudgetIncome";
import { amountSignClassname, formatCurrency, monthFormatter } from "~/lib/formatters";
import { toISOMonthString } from "~/lib/iso";
import "./BudgetPage.css";

const searchSchema = object({
  leftover: zCatch(optional(boolean()), undefined),
});

export const Route = createFileRoute("/_layout/budget/$month")({
  component: BudgetLayout,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { leftover } }) => ({ leftover }),
  loader: async ({ params: { month }, deps: { leftover } }) => {
    const [budget, budgetMonths] = await Promise.all([
      getBudgetByMonth({ data: { month, hideAccumulating: leftover } }),
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
  const { leftover } = Route.useSearch();
  const navigate = useNavigate();
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
            search: (prev) => prev,
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
              <Text className={amountSignClassname(leftToBudget)}>
                {formatCurrency(leftToBudget)}
              </Text>
            </Group>
          )}
          <Group justify="space-between">
            <Group gap="xs">
              <Text>Leftover</Text>
              <ActionIcon
                variant={leftover ? "filled" : "subtle"}
                color="gray"
                size="sm"
                aria-label="Show only leftover categories"
                aria-pressed={!!leftover}
                onClick={() =>
                  navigate({
                    to: tabLink,
                    params: { month: budget.month },
                    search: (prev) => ({ ...prev, leftover: leftover ? undefined : true }),
                  })
                }
              >
                <IconFilter />
              </ActionIcon>
            </Group>
            <Text className={amountSignClassname(leftoverRemaining)}>
              {formatCurrency(leftoverRemaining)}
            </Text>
          </Group>
        </Stack>
      </Card>
      <Outlet />
    </Stack>
  );
}
