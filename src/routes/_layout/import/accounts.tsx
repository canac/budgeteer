import { Alert, Button, Group, Stack, Switch, Table, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconBuildingBank } from "@tabler/icons-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnExit, type PlaidLinkOnSuccess } from "react-plaid-link";
import { extractErrorMessage } from "src/lib/error";
import { createLinkToken as createLinkTokenFn } from "~/functions/createLinkToken";
import { createUpdateLinkToken as createUpdateLinkTokenFn } from "~/functions/createUpdateLinkToken";
import { exchangePublicToken as exchangePublicTokenFn } from "~/functions/exchangePublicToken";
import { getExternalAccounts } from "~/functions/getExternalAccounts";
import { getExternalConnections } from "~/functions/getExternalConnections";
import { markConnectionReconnected as markConnectionReconnectedFn } from "~/functions/markConnectionReconnected";
import { setExternalAccountEnabled as setExternalAccountEnabledFn } from "~/functions/setExternalAccountEnabled";

export const Route = createFileRoute("/_layout/import/accounts")({
  component: AccountsPage,
  loader: async () => ({
    accounts: await getExternalAccounts(),
    connections: await getExternalConnections(),
  }),
  head: () => ({ meta: [{ title: "Import Accounts | Budgeteer" }] }),
});

function AccountsPage() {
  const router = useRouter();
  const { accounts, connections } = Route.useLoaderData();
  const createLinkToken = useServerFn(createLinkTokenFn);
  const createUpdateLinkToken = useServerFn(createUpdateLinkTokenFn);
  const exchangePublicToken = useServerFn(exchangePublicTokenFn);
  const markConnectionReconnected = useServerFn(markConnectionReconnectedFn);
  const setExternalAccountEnabled = useServerFn(setExternalAccountEnabledFn);

  const [linkToken, setLinkToken] = useState<string | null>(null);
  // Set while reauthenticating an existing Item (update mode)
  const [reconnectId, setReconnectId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setLinkToken(null);
    setReconnectId(null);
  }, []);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken, metadata) => {
      try {
        if (reconnectId) {
          await markConnectionReconnected({ data: { connectionId: reconnectId } });
        } else {
          await exchangePublicToken({
            data: { publicToken, institution: metadata.institution?.name ?? "Unknown" },
          });
        }
        notifications.show({
          title: reconnectId ? "Reconnected" : "Account connected",
          message: `Linked ${metadata.institution?.name ?? "your bank"}.`,
          color: "green",
        });
        reset();
        await router.invalidate();
      } catch (error: unknown) {
        notifications.show({
          title: "Failed to save connection",
          message: extractErrorMessage(error),
          color: "red",
        });
      }
    },
    [reconnectId, exchangePublicToken, markConnectionReconnected, reset, router],
  );

  const onExit = useCallback<PlaidLinkOnExit>(
    (error) => {
      if (error) {
        notifications.show({
          title: "Connection error",
          message: error.display_message,
          color: "red",
        });
      }
      reset();
    },
    [reset],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit,
  });

  // Open Link once it's ready, after the token fetch
  useEffect(() => {
    if (linkToken && ready) {
      // oxlint-disable-next-line typescript/no-unsafe-call
      open();
    }
  }, [linkToken, ready, open]);

  const startLink = (tokenPromise: Promise<{ linkToken: string }>, connectionId: string | null) => {
    setReconnectId(connectionId);
    tokenPromise
      .then(({ linkToken: token }) => {
        setLinkToken(token);
      })
      .catch((error: unknown) => {
        setReconnectId(null);
        notifications.show({
          title: "Could not start Plaid Link",
          message: extractErrorMessage(error),
          color: "red",
        });
      });
  };

  const handleConnect = () => startLink(createLinkToken(), null);

  const handleReconnect = (connectionId: string) =>
    startLink(createUpdateLinkToken({ data: { connectionId } }), connectionId);

  const handleToggle = async (id: string, enabled: boolean) => {
    await setExternalAccountEnabled({ data: { id, enabled } });
    await router.invalidate();
  };

  const needsReconnect = connections.filter((connection) => connection.loginRequired);

  return (
    <Stack gap="md">
      {needsReconnect.map((connection) => (
        <Alert
          key={connection.id}
          color="yellow"
          icon={<IconAlertTriangle />}
          title={`${connection.institution} needs to be reconnected`}
        >
          <Group justify="space-between">
            <Text size="sm">
              Its login expired, so transactions can't be imported until you reconnect.
            </Text>
            <Button size="xs" onClick={() => handleReconnect(connection.id)}>
              Reconnect
            </Button>
          </Group>
        </Alert>
      ))}
      <Group>
        <Button leftSection={<IconBuildingBank />} onClick={handleConnect}>
          Enroll a new account
        </Button>
      </Group>
      {accounts.length === 0 ? (
        <Text c="dimmed">No accounts enrolled yet.</Text>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Institution</Table.Th>
              <Table.Th>Account</Table.Th>
              <Table.Th ta="center">Sync transactions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {accounts.map((account) => (
              <Table.Tr key={account.id}>
                <Table.Td>{account.institution}</Table.Td>
                <Table.Td>{account.name}</Table.Td>
                <Table.Td ta="center">
                  <Group justify="center">
                    <Switch
                      checked={account.enabled}
                      onChange={(event) => handleToggle(account.id, event.currentTarget.checked)}
                      aria-label={`${account.enabled ? "Disable" : "Enable"} ${account.name}`}
                    />
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
