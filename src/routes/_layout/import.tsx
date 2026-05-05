import { Container, Stack, Tabs, Text, Title } from "@mantine/core";
import { createFileRoute, Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/import")({
  component: ImportLayout,
  head: () => ({ meta: [{ title: "Import | Budgeteer" }] }),
});

function ImportLayout() {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const activeTab = matchRoute({ to: "/import/rules" })
    ? "rules"
    : matchRoute({ to: "/import/accounts" })
      ? "accounts"
      : "transactions";

  const handleTabChange = async (value: string | null) => {
    if (value === "rules") {
      await navigate({ to: "/import/rules" });
    } else if (value === "accounts") {
      await navigate({ to: "/import/accounts" });
    } else {
      await navigate({ to: "/import" });
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Stack gap="xs">
          <Title order={1}>Import</Title>
          <Text c="dimmed">Import transactions from your external accounts.</Text>
        </Stack>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List>
            <Tabs.Tab value="transactions">Transactions</Tabs.Tab>
            <Tabs.Tab value="rules">Rules</Tabs.Tab>
            <Tabs.Tab value="accounts">Accounts</Tabs.Tab>
          </Tabs.List>
        </Tabs>
        <Outlet />
      </Stack>
    </Container>
  );
}
