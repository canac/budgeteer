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
import { Button, ButtonGroup, Card, Group, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowsUpDown, IconCheck, IconGripVertical, IconPlus } from "@tabler/icons-react";
import {
  createFileRoute,
  getRouteApi,
  Outlet,
  type RegisteredRouter,
  type RouteById,
  useRouter,
} from "@tanstack/react-router";
import clsx from "clsx";
import { useId, useState } from "react";
import { CategoryTypeIcons } from "~/components/CategoryTypeIcons";
import { DynamicCategoryModal } from "~/components/DynamicCategoryModal";
import { MantineLink } from "~/components/MantineLink";
import { reorderCategory } from "~/functions/reorderCategory";
import { useSyncedState } from "~/hooks/useSyncedState";
import { pluck } from "~/lib/collections";
import { formatCurrency } from "~/lib/formatters";

export const Route = createFileRoute("/_layout/budget/$month/categories")({
  component: CategoriesPage,
});

const budgetRoute = getRouteApi("/_layout/budget/$month");

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
  const { budget } = budgetRoute.useLoaderData();

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
        to="/budget/$month/categories/$category"
        params={{
          month: budget.month,
          category: budgetCategory.categoryId,
        }}
        underline="never"
        c="inherit"
      >
        <Group gap="xs">
          <Text>{budgetCategory.name}</Text>
          <CategoryTypeIcons category={budgetCategory.category} />
        </Group>
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

function CategoriesPage() {
  const router = useRouter();
  const { budget, budgetCategories } = budgetRoute.useLoaderData();
  const [viewMode, setViewMode] = useState<"budgeted" | "spent" | "balance">("budgeted");
  const [reordering, setReordering] = useState(false);

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

  const [createModalOpen, { open: openCreateModal, close: closeCreateModal }] =
    useDisclosure(false);

  return (
    <>
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
            <Button variant="subtle" leftSection={<IconPlus />} onClick={() => openCreateModal()}>
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

      <Outlet />

      {createModalOpen && (
        <DynamicCategoryModal
          onClose={closeCreateModal}
          onSave={() => router.invalidate()}
          month={budget.month}
        />
      )}
    </>
  );
}
