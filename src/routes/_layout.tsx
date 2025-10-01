import { ActionIcon, AppShell, Box, Container, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowsExchange, IconList, IconLogout, IconPlus } from "@tabler/icons-react";
import { createFileRoute, Outlet, useParams, useRouter } from "@tanstack/react-router";
import { BudgetMonthSelector } from "~/components/BudgetMonthSelector";
import { CategorySelector } from "~/components/CategorySelector";
import { DynamicNewTransferModal } from "~/components/DynamicNewTransferModal";
import { DynamicTransactionModal } from "~/components/DynamicTransactionModal";
import { MantineActionIconLink } from "~/components/MantineActionIconLink";
import { getBudgetMonths } from "~/functions/getBudgetMonths";
import { getCategories } from "~/functions/getCategories";
import { logout } from "~/functions/logout";

export const Route = createFileRoute("/_layout")({
  component: LayoutRoute,
  loader: async () => {
    const [budgetMonths, categories] = await Promise.all([getBudgetMonths(), getCategories()]);
    return { budgetMonths, categories };
  },
});

function LayoutRoute() {
  const router = useRouter();
  const [transactionOpened, { open: openTransaction, close: closeTransaction }] =
    useDisclosure(false);
  const [transferOpened, { open: openTransfer, close: closeTransfer }] = useDisclosure(false);
  const { budgetMonths, categories } = Route.useLoaderData();
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
              <BudgetMonthSelector budgetMonths={budgetMonths} currentMonth={month ?? null} />
              <CategorySelector categories={categories} currentCategory={category ?? null} />
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
                    <IconList size={24} />
                  </MantineActionIconLink>
                )}
                <ActionIcon variant="subtle" c="white" size="xl" onClick={openTransfer}>
                  <IconArrowsExchange size={24} />
                </ActionIcon>
                <ActionIcon variant="subtle" c="white" size="xl" onClick={openTransaction}>
                  <IconPlus size={24} />
                </ActionIcon>
                <ActionIcon variant="subtle" c="white" size="xl" onClick={handleLogout}>
                  <IconLogout size={24} />
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
