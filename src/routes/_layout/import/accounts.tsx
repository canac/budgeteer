import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Collapse,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArchive,
  IconArrowBackUp,
  IconBuildingBank,
  IconChevronRight,
  IconDotsVertical,
  IconPlayerPause,
  IconRefresh,
} from "@tabler/icons-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnExit, type PlaidLinkOnSuccess } from "react-plaid-link";
import { extractErrorMessage } from "src/lib/error";
import invariant from "tiny-invariant";
import { showNotification } from "~/components/LazyNotifications";
import { List, ListRow } from "~/components/List";
import { createLinkToken as createLinkTokenFn } from "~/functions/createLinkToken";
import { createUpdateLinkToken as createUpdateLinkTokenFn } from "~/functions/createUpdateLinkToken";
import { exchangePublicToken as exchangePublicTokenFn } from "~/functions/exchangePublicToken";
import { getExternalAccounts } from "~/functions/getExternalAccounts";
import { getExternalConnections } from "~/functions/getExternalConnections";
import { markConnectionReconnected as markConnectionReconnectedFn } from "~/functions/markConnectionReconnected";
import { setExternalAccountArchived as setExternalAccountArchivedFn } from "~/functions/setExternalAccountArchived";
import { setExternalAccountEnabled as setExternalAccountEnabledFn } from "~/functions/setExternalAccountEnabled";
import classes from "./AccountsPage.module.css";

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
  const setExternalAccountArchived = useServerFn(setExternalAccountArchivedFn);

  const [showArchived, setShowArchived] = useState(false);
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
          invariant(publicToken, "Plaid did not return a public token");
          await exchangePublicToken({
            data: { publicToken, institution: metadata.institution?.name ?? "Unknown" },
          });
        }
        void showNotification({
          title: reconnectId ? "Reconnected" : "Account connected",
          message: `Linked ${metadata.institution?.name ?? "your bank"}.`,
          color: "green",
        });
        reset();
        await router.invalidate();
      } catch (error: unknown) {
        void showNotification({
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
        void showNotification({
          title: "Connection error",
          message: error.display_message ?? error.error_message,
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
        void showNotification({
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

  const handleArchive = async (id: string, archived: boolean) => {
    await setExternalAccountArchived({ data: { id, archived } });
    await router.invalidate();
  };

  const needsReconnect = connections.filter((connection) => connection.loginRequired);
  const activeAccounts = accounts.filter((account) => !account.archived);
  const archivedAccounts = accounts.filter((account) => account.archived);

  return (
    <Stack className="list-column">
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
        <Paper withBorder className={classes.panel}>
          {activeAccounts.length > 0 && (
            <List className={classes.list}>
              {activeAccounts.map((account) => (
                <ListRow
                  key={account.id}
                  className={classes.row}
                  title={account.name}
                  meta={account.institution}
                  actions={
                    <Group gap={4} wrap="nowrap">
                      <Badge
                        variant="light"
                        color={account.enabled ? "green" : "gray"}
                        leftSection={<span className={classes.dot} />}
                      >
                        {account.enabled ? "Syncing" : "Paused"}
                      </Badge>
                      <Menu position="bottom-end">
                        <Menu.Target>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="lg"
                            aria-label={`Options for ${account.name}`}
                          >
                            <IconDotsVertical size={18} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={
                              account.enabled ? (
                                <IconPlayerPause size={16} />
                              ) : (
                                <IconRefresh size={16} />
                              )
                            }
                            onClick={() => handleToggle(account.id, !account.enabled)}
                          >
                            {account.enabled ? "Pause syncing" : "Resume syncing"}
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            leftSection={<IconArchive size={16} />}
                            onClick={() => handleArchive(account.id, true)}
                          >
                            Archive account
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  }
                />
              ))}
            </List>
          )}
          {archivedAccounts.length > 0 && (
            <>
              <UnstyledButton
                className={classes.footer}
                aria-expanded={showArchived}
                onClick={() => setShowArchived(!showArchived)}
              >
                <IconChevronRight size={16} className={classes.chevron} />
                {archivedAccounts.length} archived{" "}
                {archivedAccounts.length === 1 ? "account" : "accounts"}
              </UnstyledButton>
              <Collapse expanded={showArchived}>
                <List className={clsx(classes.list, classes.archived)}>
                  {archivedAccounts.map((account) => (
                    <ListRow
                      key={account.id}
                      className={classes.row}
                      title={
                        <Text span c="dimmed">
                          {account.name}
                        </Text>
                      }
                      meta={account.institution}
                      actions={
                        <ActionIcon
                          variant="subtle"
                          size="lg"
                          aria-label={`Unarchive ${account.name}`}
                          onClick={() => handleArchive(account.id, false)}
                        >
                          <IconArrowBackUp size={18} />
                        </ActionIcon>
                      }
                    />
                  ))}
                </List>
              </Collapse>
            </>
          )}
        </Paper>
      )}
    </Stack>
  );
}
