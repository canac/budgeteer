import { AppShell, Box, Burger, Container, Group, Loader } from "@mantine/core";
import { useDisclosure, useMounted } from "@mantine/hooks";
import { createFileRoute, Outlet, useParams, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { usePreloadWhenIdle } from "src/hooks/usePreloadWhenIdle";
import { DynamicCreateMenu } from "~/components/DynamicCreateMenu";
import { DynamicNavDrawer, preloadNavDrawer } from "~/components/DynamicNavDrawer";
import { DynamicPreferencesModal } from "~/components/DynamicPreferencesModal";
import { DynamicTransactionModal } from "~/components/DynamicTransactionModal";
import { DynamicTransferModal } from "~/components/DynamicTransferModal";
import { MantineLink } from "~/components/MantineLink";
import { getBudgetMonths } from "~/functions/getBudgetMonths";
import { getCategories } from "~/functions/getCategories";
import { getUnreviewedTransactionCount } from "~/functions/getUnreviewedTransactionCount";
import { useReduceMotion } from "~/hooks/useReduceMotion";
import { useRouterLoading } from "~/hooks/useRouterLoading";
import { preloadOnHover } from "~/lib/preloadOnHover";

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
  const [preferencesOpened, { open: openPreferences, close: closePreferences }] =
    useDisclosure(false);
  const month = useParams({
    from: "/_layout/budget/$month",
    shouldThrow: false,
    select: (params) => params.month,
  });
  const loading = useRouterLoading();
  const mounted = useMounted();
  const { reduceMotion } = useReduceMotion();
  usePreloadWhenIdle(preloadNavDrawer);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-reduce-motion", reduceMotion);
  }, [reduceMotion]);

  const handleUpdate = async () => {
    await router.invalidate();
  };

  return (
    <>
      {transactionOpened && (
        <DynamicTransactionModal onClose={closeTransaction} onSave={handleUpdate} />
      )}
      {transferOpened && <DynamicTransferModal onClose={closeTransfer} onSave={handleUpdate} />}
      {preferencesOpened && <DynamicPreferencesModal onClose={closePreferences} />}

      {drawerOpened && (
        <DynamicNavDrawer
          onClose={closeDrawer}
          currentMonth={month ?? null}
          onOpenPreferences={openPreferences}
        />
      )}

      <AppShell header={{ height: 60 }} padding="md">
        <AppShell.Header
          style={{
            background: "linear-gradient(135deg, #51cf66ff 0%, #0d8523ff 100%)",
            color: "white",
          }}
        >
          <Container size="xl" h="100%">
            <Group h="100%" gap="sm">
              <Burger
                {...preloadOnHover(preloadNavDrawer)}
                onClick={openDrawer}
                color="white"
                size="md"
                aria-label="Open navigation"
              />
              <MantineLink to="/" c="white" underline="never" fz="xl" fw="bold">
                Budgeteer
              </MantineLink>
              {mounted && loading && <Loader size="sm" color="white" />}
              <Box flex={1} />
              <DynamicCreateMenu onNewTransaction={openTransaction} onNewTransfer={openTransfer} />
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
