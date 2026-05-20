import { Badge, Drawer, NavLink } from "@mantine/core";
import { IconFileImport, IconLogout } from "@tabler/icons-react";
import { getRouteApi, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { logout as logoutServerFn } from "~/functions/logout";
import { BudgetMonthSelector } from "./BudgetMonthSelector";
import { CategorySelector } from "./CategorySelector";
import { MantineNavLink } from "./MantineNavLink";
import "./NavDrawer.css";

const routeApi = getRouteApi("/_layout");

interface NavDrawerProps {
  opened: boolean;
  onClose: () => void;
  currentMonth: string | null;
}

export function NavDrawer({ opened, onClose, currentMonth }: NavDrawerProps) {
  const { budgetMonths, categories, unreviewedCount } = routeApi.useLoaderData();
  const category = useParams({
    from: "/_layout/category/$category",
    shouldThrow: false,
    select: (params) => params.category,
  });
  const logout = useServerFn(logoutServerFn);

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Budgeteer"
      position="left"
      classNames={{ content: "NavDrawer" }}
      styles={{
        content: {
          backgroundColor: "#2b8a3e",
          color: "white",
        },
        header: { background: "transparent", color: "white" },
        title: { fontWeight: "bold" },
        close: { color: "white" },
      }}
    >
      <NavLink
        key={`months-${currentMonth ?? "none"}`}
        label="Months"
        defaultOpened={currentMonth !== null}
        fw="bold"
      >
        <BudgetMonthSelector
          budgetMonths={budgetMonths}
          currentMonth={currentMonth}
          onNavigate={onClose}
        />
      </NavLink>
      <NavLink
        key={`categories-${category ?? "none"}`}
        label="Categories"
        defaultOpened={category !== undefined}
        fw="bold"
      >
        <CategorySelector
          categories={categories}
          currentCategory={category ?? null}
          onNavigate={onClose}
        />
      </NavLink>
      <MantineNavLink
        to="/import"
        label="Import"
        leftSection={<IconFileImport size={18} />}
        rightSection={
          unreviewedCount > 0 && (
            <Badge color="red" size="sm" radius="xl">
              {unreviewedCount > 99 ? "99+" : unreviewedCount}
            </Badge>
          )
        }
        onClick={onClose}
      />
      <NavLink
        component="button"
        label="Logout"
        leftSection={<IconLogout size={18} />}
        onClick={handleLogout}
      />
    </Drawer>
  );
}
