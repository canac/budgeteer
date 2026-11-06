import { Badge, Drawer, NavLink } from "@mantine/core";
import {
  IconCalendarMonth,
  IconCategory,
  IconChartBar,
  IconFileImport,
  IconLogout,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react";
import { getRouteApi, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { preloadPreferencesModal } from "~/components/DynamicPreferencesModal";
import { logout as logoutServerFn } from "~/functions/logout";
import { useOpened } from "~/hooks/useOpened";
import { preloadOnHover } from "~/lib/preloadOnHover";
import { BudgetMonthSelector } from "./BudgetMonthSelector";
import { CategorySelector } from "./CategorySelector";
import { MantineNavLink } from "./MantineNavLink";
import classes from "./NavDrawer.module.css";

const routeApi = getRouteApi("/_layout");

export interface NavDrawerProps {
  onClose: () => void;
  currentMonth: string | null;
  onOpenPreferences: () => void;
}

export function NavDrawer({ onClose, currentMonth, onOpenPreferences }: NavDrawerProps) {
  const { budgetMonths, categories, unreviewedCount } = routeApi.useLoaderData();
  const category = useParams({
    from: "/_layout/category/$category",
    shouldThrow: false,
    select: (params) => params.category,
  });
  const logout = useServerFn(logoutServerFn);
  const { close, modalProps } = useOpened({ onClose });

  const handleLogout = async () => {
    close();
    await logout();
  };

  return (
    <Drawer
      {...modalProps}
      title="Budgeteer"
      position="left"
      classNames={{ content: classes.root }}
      styles={{
        content: {
          backgroundColor: "#2b8a3e",
          color: "white",
        },
        header: { background: "transparent", color: "white" },
        close: { color: "white" },
      }}
    >
      <MantineNavLink
        to="/"
        label="Overview"
        leftSection={<IconChartBar size={18} />}
        onClick={close}
      />
      <MantineNavLink
        to="/search"
        label="Search"
        leftSection={<IconSearch size={18} />}
        onClick={close}
      />
      <NavLink
        key={`months-${currentMonth ?? "none"}`}
        label="Months"
        leftSection={<IconCalendarMonth size={18} />}
        defaultOpened={currentMonth !== null}
        fw="bold"
      >
        <BudgetMonthSelector
          budgetMonths={budgetMonths}
          currentMonth={currentMonth}
          onNavigate={close}
        />
      </NavLink>
      <NavLink
        key={`categories-${category ?? "none"}`}
        label="Categories"
        leftSection={<IconCategory size={18} />}
        defaultOpened={category !== undefined}
        fw="bold"
      >
        <CategorySelector
          categories={categories}
          currentCategory={category ?? null}
          onNavigate={close}
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
        onClick={close}
      />
      <NavLink
        component="button"
        label="Preferences"
        leftSection={<IconSettings size={18} />}
        {...preloadOnHover(preloadPreferencesModal)}
        onClick={() => {
          close();
          onOpenPreferences();
        }}
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
