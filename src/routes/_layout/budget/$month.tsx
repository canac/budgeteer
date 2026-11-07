import { ActionIcon, Card, Group, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowsRightLeft, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { createFileRoute, Outlet, useMatchRoute, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { addMonths, parseISO, startOfMonth, subMonths } from "date-fns";
import { Clickable } from "~/components/Clickable";
import {
  DynamicLeftoversTransferModal,
  preloadLeftoversTransferModal,
} from "~/components/DynamicLeftoversTransferModal";
import { EditIcon } from "~/components/EditIcon";
import { MantineActionIconLink } from "~/components/MantineActionIconLink";
import { MonthSwiper } from "~/components/MonthSwiper";
import { getBudgetByMonth } from "~/functions/getBudgetByMonth";
import { getBudgetMonths } from "~/functions/getBudgetMonths";
import { setBudgetIncome } from "~/functions/setBudgetIncome";
import { useEditableAmount } from "~/hooks/useEditableAmount";
import { useToday } from "~/hooks/useToday";
import { amountSignClassname, formatCurrency, monthFormatter } from "~/lib/formatters";
import { toISOMonthString } from "~/lib/iso";
import { preloadOnHover } from "~/lib/preloadOnHover";
import classes from "./BudgetPage.module.css";

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
  const matchRoute = useMatchRoute();
  const today = useToday();
  const onTransactions = !!matchRoute({ to: "/budget/$month/transactions", fuzzy: true });
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
  const income = useEditableAmount({
    className: leftToBudget === 0 ? "positive" : undefined,
    amount: budget.income,
    saveAmount: handleSaveIncome,
  });

  return (
    <MonthSwiper
      month={budget.month}
      firstMonth={budgetMonths.at(-1) ?? budget.month}
      lastMonth={toISOMonthString(today)}
      preload={(month) => {
        void router.preloadRoute({ to: tabLink, params: { month }, search: true });
      }}
      onSwipe={(month) => router.navigate({ to: tabLink, params: { month }, search: true })}
    >
      <Stack className={clsx(classes.root, "list-column")}>
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
        <Group gap="xs" justify="center">
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
            <ActionIcon
              variant="subtle"
              size="lg"
              color="gray"
              disabled
              aria-label="Previous month"
            >
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
            <Clickable className={classes.clickableRow} onClick={income.edit}>
              <Group justify="space-between">
                <Title order={2} className={classes.iconLabel}>
                  Income
                  <EditIcon />
                </Title>
                {income.field}
              </Group>
            </Clickable>
            {leftToBudget !== 0 && (
              <Group justify="space-between">
                <Text>Left to budget</Text>
                <Text className={amountSignClassname(leftToBudget)}>
                  {formatCurrency(leftToBudget)}
                </Text>
              </Group>
            )}
            <Clickable
              className={classes.clickableRow}
              onClick={canTransferLeftovers ? openLeftoversTransfer : undefined}
              {...(canTransferLeftovers && preloadOnHover(preloadLeftoversTransferModal))}
              title={canTransferLeftovers ? "Transfer leftovers" : undefined}
            >
              <Group justify="space-between">
                <Text className={classes.iconLabel}>
                  Leftover
                  {canTransferLeftovers && <EditIcon icon={IconArrowsRightLeft} />}
                </Text>
                <Text className={amountSignClassname(leftoverRemaining)}>
                  {formatCurrency(leftoverRemaining)}
                </Text>
              </Group>
            </Clickable>
          </Stack>
        </Card>
        <Outlet />
      </Stack>
    </MonthSwiper>
  );
}
