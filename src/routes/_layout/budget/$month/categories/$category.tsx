import { createFileRoute } from "@tanstack/react-router";
import {
  CategoryDrawer,
  categoryDrawerHead,
  loadCategoryDrawer,
} from "~/components/CategoryDrawer";

export const Route = createFileRoute("/_layout/budget/$month/categories/$category")({
  component: CategoryDetailsPage,
  loader: loadCategoryDrawer,
  head: categoryDrawerHead,
});

function CategoryDetailsPage() {
  const { budgetCategory } = Route.useLoaderData();
  const { month, category } = Route.useParams();

  return <CategoryDrawer budgetCategory={budgetCategory} month={month} category={category} />;
}
