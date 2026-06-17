import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ActionIcon, Button, ButtonGroup, Card, Group, Stack, Text, Title } from "@mantine/core";
import {
  IconArrowsUpDown,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconGripVertical,
  IconPlus,
} from "@tabler/icons-react";
import {
  createFileRoute,
  Outlet,
  type RegisteredRouter,
  type RouteById,
  useRouter,
} from "@tanstack/react-router";
import clsx from "clsx";
import { addMonths, parseISO, subMonths } from "date-fns";
import { useId, useState } from "react";
import { EditableAmount } from "~/components/EditableAmount";
import { MantineActionIconLink } from "~/components/MantineActionIconLink";
import { MantineLink } from "~/components/MantineLink";
import { createCategory } from "~/functions/createCategory";
import { getBudgetByMonth } from "~/functions/getBudgetByMonth";
import { getBudgetMonths } from "~/functions/getBudgetMonths";
import { reorderCategory } from "~/functions/reorderCategory";
import { setBudgetIncome } from "~/functions/setBudgetIncome";
import { useSyncedState } from "~/hooks/useSyncedState";
import { pluck } from "~/lib/collections";
import { formatCurrency, monthFormatter } from "~/lib/formatters";
import { toISOMonthString } from "~/lib/iso";
import "./BudgetPage.css";

export const Route = createFileRoute("/_layout/budget/$month")({
  component: BudgetPage,
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

type BudgetCategory = RouteById<
  RegisteredRouter["routeTree"],
  "/_layout/budget/$month"
>["types"]["loaderData"]["budgetCategories"][number];

interface CategoryItemProps {
  budgetCategory: BudgetCategory;
  viewMode: "budgeted" | "spent" | "balance";
  reordering: boolean;
}

function CategoryItem({ budgetCategory, viewMode, reordering }: CategoryItemProps) {
  const { budget } = Route.useLoaderData();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: budgetCategory.categoryId,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      className={clsx("CategoryItem", { dragging: isDragging })}
      ref={setNodeRef}
      style={style}
      {...attributes}
    >
      {reordering && (
        <div className="drag-handle" {...listeners}>
          <IconGripVertical size={18} stroke={1.5} />
        </div>
      )}
      <MantineLink
        to="/budget/$month/category/$category"
        params={{
          month: budget.month,
          category: budgetCategory.categoryId,
        }}
        underline="never"
        c="inherit"
      >
        <Text>{budgetCategory.name}</Text>
        <Text>
          {formatCurrency(
            viewMode === "budgeted"
              ? budgetCategory.budgetedAmount
              : viewMode === "spent"
                ? budgetCategory.spent
                : budgetCategory.balance,
          )}
        </Text>
      </MantineLink>
    </div>
  );
}

function BudgetPage() {
  const router = useRouter();
  const { budget, totalBudgetedAmount, budgetCategories, budgetMonths, leftoverRemaining } =
    Route.useLoaderData();
  const [viewMode, setViewMode] = useState<"budgeted" | "spent" | "balance">("budgeted");
  const [reordering, setReordering] = useState(false);
  const leftToBudget = budget.income - totalBudgetedAmount;

  const previousMonth =
    budget.month === budgetMonths.at(-1)
      ? undefined
      : toISOMonthString(subMonths(parseISO(budget.month), 1));
  const nextMonth =
    budget.month === toISOMonthString(new Date())
      ? undefined
      : toISOMonthString(addMonths(parseISO(budget.month), 1));

  const [categories, setCategories] = useSyncedState(budgetCategories);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const accessibilityId = useId();

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = categories.findIndex((category) => category.categoryId === active.id);
    const newIndex = categories.findIndex((category) => category.categoryId === over.id);
    setCategories(arrayMove(categories, oldIndex, newIndex));

    if (typeof active.id === "string" && typeof over.id === "string") {
      await reorderCategory({
        data: {
          month: budget.month,
          categoryId: active.id,
          targetId: over.id,
          direction: newIndex < oldIndex ? "before" : "after",
        },
      });
      await router.invalidate();
    }
  };

  const handleSaveIncome = async (newIncome: number) => {
    await setBudgetIncome({
      data: { month: budget.month, income: newIncome },
    });
    await router.invalidate();
  };

  const handleCreateCategory = async () => {
    await createCategory({
      data: { month: budget.month, name: "New Category" },
    });
    await router.invalidate();
  };

  return (
    <>
      <Outlet />
      <Stack className="BudgetPage" align="center">
        <Group gap="xs">
          {previousMonth ? (
            <MantineActionIconLink
              to="/budget/$month"
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
              to="/budget/$month"
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

        <Card shadow="sm">
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
            <DndContext
              id={accessibilityId}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pluck(categories, "categoryId")}
                strategy={verticalListSortingStrategy}
              >
                {categories.map((budgetCategory) => (
                  <CategoryItem
                    key={budgetCategory.id}
                    budgetCategory={budgetCategory}
                    viewMode={viewMode}
                    reordering={reordering}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <Group justify="space-evenly">
              <Button
                variant="subtle"
                leftSection={<IconPlus />}
                onClick={() => handleCreateCategory()}
              >
                Add Category
              </Button>

              {reordering ? (
                <Button
                  variant="subtle"
                  color="green"
                  leftSection={<IconCheck />}
                  onClick={() => setReordering(false)}
                >
                  Done Reordering
                </Button>
              ) : (
                <Button
                  variant="subtle"
                  leftSection={<IconArrowsUpDown />}
                  onClick={() => setReordering(true)}
                >
                  Reorder
                </Button>
              )}
            </Group>
          </Stack>
        </Card>
      </Stack>
    </>
  );
}
