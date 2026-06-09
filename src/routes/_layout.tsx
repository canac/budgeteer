import { ActionIcon, AppShell, Box, Burger, Container, Group, Loader } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowsExchange, IconList, IconPlus } from "@tabler/icons-react";
import {
  createFileRoute,
  Outlet,
  useParams,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { DynamicNewTransferModal } from "~/components/DynamicNewTransferModal";
import { DynamicTransactionModal } from "~/components/DynamicTransactionModal";
import { MantineActionIconLink } from "~/components/MantineActionIconLink";
import { MantineLink } from "~/components/MantineLink";
import { NavDrawer } from "~/components/NavDrawer";
import { getBudgetMonths } from "~/functions/getBudgetMonths";
import { getCategories } from "~/functions/getCategories";
import { getUnreviewedTransactionCount } from "~/functions/getUnreviewedTransactionCount";

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
  const [transactionOpened, { open: openTransaction, close: closeTransaction }] =
    useDisclosure(false);
  const [transferOpened, { open: openTransfer, close: closeTransfer }] = useDisclosure(false);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const month = useParams({
    from: "/_layout/budget/$month",
    shouldThrow: false,
    select: (params) => params.month,
  });
  const loading = useRouterState({
    select: (state) => state.isLoading || state.status === "pending",
  });

  const handleUpdate = async () => {
    await router.invalidate();
  };

  return (
    <>
      {transactionOpened && (
        <DynamicTransactionModal onClose={closeTransaction} onSave={handleUpdate} />
      )}
      {transferOpened && <DynamicNewTransferModal onClose={closeTransfer} onSave={handleUpdate} />}

      <NavDrawer opened={drawerOpened} onClose={closeDrawer} currentMonth={month ?? null} />

      <AppShell header={{ height: 60 }} padding="md">
        <AppShell.Header
          style={{
            background: "linear-gradient(135deg, #51cf66ff 0%, #0d8523ff 100%)",
            color: "white",
          }}
        >
          <Container size="xl" h="100%">
            <Group align="center" h="100%" gap="sm">
              <Burger
                opened={drawerOpened}
                onClick={openDrawer}
                color="white"
                size="md"
                aria-label="Open navigation"
              />
              <MantineLink to="/" c="white" underline="never" fz="xl" fw="bold">
                Budgeteer
              </MantineLink>
              {loading && <Loader size="sm" color="white" />}
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
