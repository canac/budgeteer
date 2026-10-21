import { ActionIcon, Card, Group, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconArrowsRightLeft,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconFilterOff,
} from "@tabler/icons-react";
import { createFileRoute, Outlet, useMatchRoute, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { addMonths, parseISO, startOfMonth, subMonths } from "date-fns";
import { boolean, object, optional, catch as zCatch } from "zod/mini";
import { DynamicLeftoversTransferModal } from "~/components/DynamicLeftoversTransferModal";
import { EditableAmount } from "~/components/EditableAmount";
import { MantineActionIconLink } from "~/components/MantineActionIconLink";
import { MantineButtonLink } from "~/components/MantineButtonLink";
import { getBudgetByMonth } from "~/functions/getBudgetByMonth";
import { getBudgetMonths } from "~/functions/getBudgetMonths";
import { setBudgetIncome } from "~/functions/setBudgetIncome";
import { useToday } from "~/hooks/useToday";
import { amountSignClassname, formatCurrency, monthFormatter } from "~/lib/formatters";
import { toISOMonthString } from "~/lib/iso";
import classes from "./BudgetPage.module.css";

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
  const {
    budget,
    budgetCategories,
    totalBudgetedAmount,
    budgetMonths,
    leftoverRemaining,
    leftoversDestinationIds,
    funds,
  } = Route.useLoaderData();
  const [leftoversTransferOpened, { open: openLeftoversTransfer, close: closeLeftoversTransfer }] =
    useDisclosure(false);
  const { leftover } = Route.useSearch();
  const matchRoute = useMatchRoute();
  const today = useToday();
  const onTransactions = !!matchRoute({ to: "/budget/$month/transactions" });
  const leftToBudget = budget.income - totalBudgetedAmount;

  const previousMonth =
    budget.month === budgetMonths.at(-1)
      ? undefined
      : toISOMonthString(subMonths(parseISO(budget.month), 1));
  const nextMonth =
    budget.month === toISOMonthString(today)
      ? undefined
      : toISOMonthString(addMonths(parseISO(budget.month), 1));

  const leftovers = budgetCategories.filter(
    ({ category, balance }) => !category.accumulating && balance !== 0,
  );
  const canTransferLeftovers = parseISO(budget.month) < startOfMonth(today) && leftovers.length > 0;

  const tabLink = onTransactions ? "/budget/$month/transactions" : "/budget/$month/categories";

  const handleSaveIncome = async (newIncome: number) => {
    await setBudgetIncome({
      data: { month: budget.month, income: newIncome },
    });
    await router.invalidate();
  };

  return (
    <Stack className={classes.root} align="center">
      {leftoversTransferOpened && (
        <DynamicLeftoversTransferModal
          month={budget.month}
          leftovers={leftovers}
          funds={funds}
          existingDestinationIds={leftoversDestinationIds}
          onClose={closeLeftoversTransfer}
          onSave={() => router.invalidate()}
        />
      )}
      <Group gap="xs">
        {previousMonth ? (
          <MantineActionIconLink
            to={tabLink}
            params={{ month: previousMonth }}
            search
            variant="subtle"
            size="lg"
            color="gray"
            aria-label="Previous month"
          >
            <IconChevronLeft />
          </MantineActionIconLink>
        ) : (
          <ActionIcon variant="subtle" size="lg" color="gray" disabled aria-label="Previous month">
            <IconChevronLeft />
          </ActionIcon>
        )}
        <Title order={1}>{monthFormatter.format(parseISO(budget.month))}</Title>
        {nextMonth ? (
          <MantineActionIconLink
            to={tabLink}
            params={{ month: nextMonth }}
            search={true}
            variant="subtle"
            size="lg"
            color="gray"
            aria-label="Next month"
          >
            <IconChevronRight />
          </MantineActionIconLink>
        ) : (
          <ActionIcon variant="subtle" size="lg" color="gray" disabled aria-label="Next month">
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
              className={clsx(classes.income, { positive: leftToBudget === 0 })}
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
          <Group className={classes.leftoverRow} gap={0} wrap="nowrap">
            <MantineButtonLink
              to={tabLink}
              params={{ month: budget.month }}
              search={(prev) => ({ ...prev, leftover: leftover ? undefined : true })}
              variant="subtle"
              color="gray"
              justify="space-between"
              rightSection={
                <Text className={amountSignClassname(leftoverRemaining)}>
                  {formatCurrency(leftoverRemaining)}
                </Text>
              }
              aria-label={leftover ? "Show all categories" : "Show only leftover categories"}
              className={classes.leftoverToggle}
            >
              <Group gap="xs" wrap="nowrap">
                Leftover
                {leftover && <IconFilter className={classes.icon} size={18} />}
                {leftover ? (
                  <IconFilterOff className={classes.hoverIcon} size={18} />
                ) : (
                  <IconFilter className={classes.hoverIcon} size={18} />
                )}
              </Group>
            </MantineButtonLink>
            {canTransferLeftovers && (
              <ActionIcon
                variant="subtle"
                size="lg"
                color="gray"
                onClick={openLeftoversTransfer}
                aria-label="Transfer leftovers"
                title="Transfer leftovers"
              >
                <IconArrowsRightLeft size={18} />
              </ActionIcon>
            )}
          </Group>
        </Stack>
      </Card>
      <Outlet />
    </Stack>
  );
}
