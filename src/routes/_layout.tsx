import { ActionIcon, AppShell, Box, Container, Group, Indicator } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowsExchange, IconHome, IconList, IconLogout, IconPlus } from "@tabler/icons-react";
import { createFileRoute, Outlet, useParams, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BudgetMonthSelector } from "~/components/BudgetMonthSelector";
import { CategorySelector } from "~/components/CategorySelector";
import { DynamicNewTransferModal } from "~/components/DynamicNewTransferModal";
import { DynamicTransactionModal } from "~/components/DynamicTransactionModal";
import { MantineActionIconLink } from "~/components/MantineActionIconLink";
import { MantineLink } from "~/components/MantineLink";
import { getBudgetMonths } from "~/functions/getBudgetMonths";
import { getCategories } from "~/functions/getCategories";
import { getUnreviewedTransactionCount } from "~/functions/getUnreviewedTransactionCount";
import { logout as logoutServerFn } from "~/functions/logout";

export const Route = createFileRoute("/_layout")({
  component: LayoutRoute,
  loader: async () => {
    const [budgetMonths, categories, unreviewedCount] = await Promise.all([
      getBudgetMonths(),
      getCategories(),
      getUnreviewedTransactionCount(),
    ]);
    return { budgetMonths, categories, unreviewedCount };
  },
});

function LayoutRoute() {
  const router = useRouter();
  const logout = useServerFn(logoutServerFn);
  const [transactionOpened, { open: openTransaction, close: closeTransaction }] =
    useDisclosure(false);
  const [transferOpened, { open: openTransfer, close: closeTransfer }] = useDisclosure(false);
  const { budgetMonths, categories, unreviewedCount } = Route.useLoaderData();
  const month = useParams({
    from: "/_layout/budget/$month",
    shouldThrow: false,
    select: (params) => params.month,
  });
  const category = useParams({
    from: "/_layout/category/$category",
    shouldThrow: false,
    select: (params) => params.category,
  });

  const handleUpdate = async () => {
    await router.invalidate();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {transactionOpened && (
        <DynamicTransactionModal onClose={closeTransaction} onSave={handleUpdate} />
      )}
      {transferOpened && <DynamicNewTransferModal onClose={closeTransfer} onSave={handleUpdate} />}

      <AppShell header={{ height: 60 }} padding="md">
        <AppShell.Header
          style={{
            background: "linear-gradient(135deg, #51cf66ff 0%, #0d8523ff 100%)",
            color: "white",
          }}
        >
          <Container size="xl" h="100%">
            <Group align="center" h="100%">
              <MantineActionIconLink variant="subtle" c="white" size="xl" to="/" aria-label="Home">
                <IconHome />
              </MantineActionIconLink>
              <BudgetMonthSelector budgetMonths={budgetMonths} currentMonth={month ?? null} />
              <CategorySelector categories={categories} currentCategory={category ?? null} />
              <Indicator
                label={unreviewedCount}
                showZero={false}
                maxValue={99}
                size={16}
                color="red"
                offset={{ x: -16, y: 4 }}
              >
                <MantineLink to="/import" c="white" fw="bold">
                  Import
                </MantineLink>
              </Indicator>
              <Box flex={1} />
              <Group gap="xs">
                {month && (
                  <MantineActionIconLink
                    variant="subtle"
                    c="white"
                    size="xl"
                    to="/budget/$month/transactions"
                    params={{ month }}
                  >
                    <IconList />
                  </MantineActionIconLink>
                )}
                <ActionIcon variant="subtle" c="white" size="xl" onClick={openTransfer}>
                  <IconArrowsExchange />
                </ActionIcon>
                <ActionIcon variant="subtle" c="white" size="xl" onClick={openTransaction}>
                  <IconPlus />
                </ActionIcon>
                <ActionIcon variant="subtle" c="white" size="xl" onClick={handleLogout}>
                  <IconLogout />
                </ActionIcon>
              </Group>
            </Group>
          </Container>
        </AppShell.Header>

        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </>
  );
}
