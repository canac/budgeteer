import { Button, Group, Stack, Switch, Table, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBuildingBank } from "@tabler/icons-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { createTellerEnrollment as createTellerEnrollmentFn } from "~/functions/createTellerEnrollment";
import { getTellerAccounts } from "~/functions/getTellerAccounts";
import { setTellerAccountEnabled as setTellerAccountEnabledFn } from "~/functions/setTellerAccountEnabled";

interface TellerEnrollmentResult {
  accessToken: string;
  enrollment: {
    id: string;
    institution: { name: string };
  };
}

interface TellerConnectInstance {
  open(): void;
}

interface TellerConnectSetupOptions {
  applicationId: string;
  environment: string;
  products: string[];
  onSuccess: (enrollment: TellerEnrollmentResult) => void;
  onExit?: () => void;
  onFailure?: (failure: { type: string; code: string; message: string }) => void;
}

declare global {
  interface Window {
    TellerConnect?: {
      setup(options: TellerConnectSetupOptions): TellerConnectInstance;
    };
  }
}

function loadTellerScript(): Promise<void> {
  const CONNECT_SCRIPT_ID = "teller-connect";

  if (window.TellerConnect) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>(`script#${CONNECT_SCRIPT_ID}`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Teller Connect")));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = CONNECT_SCRIPT_ID;
    script.src = "https://cdn.teller.io/connect/connect.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Teller Connect"));
    document.head.appendChild(script);
  });
}

export const Route = createFileRoute("/_layout/import/accounts")({
  component: AccountsPage,
  loader: () => getTellerAccounts(),
  head: () => ({ meta: [{ title: "Import Accounts | Budgeteer" }] }),
});

function AccountsPage() {
  const router = useRouter();
  const accounts = Route.useLoaderData();
  const createTellerEnrollment = useServerFn(createTellerEnrollmentFn);
  const setTellerAccountEnabled = useServerFn(setTellerAccountEnabledFn);
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    loadTellerScript().then(
      () => setReady(true),
      (err: Error) =>
        notifications.show({
          title: "Teller Connect failed to load",
          message: err.message,
          color: "red",
        }),
    );
  }, []);

  const handleConnect = () => {
    if (!window.TellerConnect) {
      return;
    }

    setOpening(true);
    const tellerConnect = window.TellerConnect.setup({
      applicationId: import.meta.env.VITE_TELLER_APP_ID,
      environment: import.meta.env.VITE_TELLER_ENV,
      products: ["transactions"],
      onSuccess: async (enrollment) => {
        try {
          await createTellerEnrollment({
            data: {
              enrollmentId: enrollment.enrollment.id,
              accessToken: enrollment.accessToken,
            },
          });
          notifications.show({
            title: "Account connected",
            message: `Linked ${enrollment.enrollment.institution.name}.`,
            color: "green",
          });
          await router.invalidate();
        } catch (err) {
          notifications.show({
            title: "Failed to save enrollment",
            message: err instanceof Error ? err.message : String(err),
            color: "red",
          });
        }
      },
      onExit: () => setOpening(false),
      onFailure: (failure) => {
        setOpening(false);
        notifications.show({
          title: "Teller Connect error",
          message: failure.message,
          color: "red",
        });
      },
    });
    tellerConnect.open();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await setTellerAccountEnabled({ data: { id, enabled } });
    await router.invalidate();
  };

  return (
    <Stack gap="md">
      <Group>
        <Button
          leftSection={<IconBuildingBank />}
          onClick={handleConnect}
          loading={opening}
          disabled={!ready}
        >
          Enroll a new account
        </Button>
      </Group>
      {accounts.length === 0 ? (
        <Text c="dimmed">No accounts enrolled yet.</Text>
      ) : (
        <Table striped>
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
