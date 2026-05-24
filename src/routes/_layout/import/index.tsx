import { Button, Group, Pagination, Stack, Switch, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconDownload } from "@tabler/icons-react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { boolean, coerce, object, optional } from "zod/mini";
import { UnreviewedTransactions } from "~/components/UnreviewedTransactions";
import { acceptTransaction as acceptTransactionFn } from "~/functions/acceptTransaction";
import { getUnreviewedTransactions } from "~/functions/getUnreviewedTransactions";
import { importTransactions as importTransactionsFn } from "~/functions/importTransactions";
import { rejectTransaction as rejectTransactionFn } from "~/functions/rejectTransaction";
import { restoreTransaction as restoreTransactionFn } from "~/functions/restoreTransaction";
import { useSyncedState } from "~/hooks/useSyncedState";

const PAGE_SIZE = 25;

const searchSchema = object({
  page: optional(coerce.number()),
  rejected: optional(boolean()),
});

export const Route = createFileRoute("/_layout/import/")({
  component: ImportTransactionsPage,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { page, rejected } }) => ({ page, rejected }),
  loader: ({ deps: { page, rejected } }) =>
    getUnreviewedTransactions({ data: { page, pageSize: PAGE_SIZE, rejected: rejected ?? false } }),
  head: () => ({ meta: [{ title: "Import Transactions | Budgeteer" }] }),
});

function ImportTransactionsPage() {
  const router = useRouter();
  const loaderData = Route.useLoaderData();
  const { page, rejected } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const importTransactions = useServerFn(importTransactionsFn);
  const acceptTransaction = useServerFn(acceptTransactionFn);
  const rejectTransaction = useServerFn(rejectTransactionFn);
  const restoreTransaction = useServerFn(restoreTransactionFn);
  const [importing, setImporting] = useState(false);

  const [transactions, setTransactions] = useSyncedState(loaderData.transactions);
  const [total, setTotal] = useSyncedState(loaderData.total);

  const removeTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const imported = await importTransactions();
      notifications.show({
        title: "Import complete",
        message: `Imported ${imported} new transaction${imported === 1 ? "" : "s"}.`,
        color: "green",
      });
      await router.invalidate();
    } finally {
      setImporting(false);
    }
  };

  const handleAccept = async (id: string) => {
    removeTransaction(id);
    await acceptTransaction({ data: { id } });
    await router.invalidate();
  };

  const handleReject = async (id: string) => {
    removeTransaction(id);
    await rejectTransaction({ data: { id } });
    await router.invalidate();
  };

  const handleEdit = async (id: string) => {
    removeTransaction(id);
    await router.invalidate();
  };

  const handleRestore = async (id: string) => {
    removeTransaction(id);
    await restoreTransaction({ data: { id } });
    await router.invalidate();
  };

  const handlePageChange = async (newPage: number) => {
    await navigate({ search: (prev) => ({ ...prev, page: newPage }) });
  };

  const handleToggleRejected = async (checked: boolean) => {
    await navigate({
      search: (prev) => ({ ...prev, rejected: checked || undefined, page: undefined }),
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text>
          You have {total} transaction{total === 1 ? "" : "s"} pending review
        </Text>
        <Group>
          <Switch
            label="Show rejected"
            checked={rejected ?? false}
            onChange={(event) => handleToggleRejected(event.currentTarget.checked)}
          />
          <Button leftSection={<IconDownload />} onClick={handleImport} loading={importing}>
            Import Transactions
          </Button>
        </Group>
      </Group>
      {total === 0 ? (
        <Text c="dimmed">
          {rejected ? "No rejected transactions." : "No unreviewed transactions."}
        </Text>
      ) : (
        <>
          <UnreviewedTransactions
            transactions={transactions}
            onAccept={handleAccept}
            onReject={handleReject}
            onEdit={handleEdit}
            onRestore={handleRestore}
          />
          {totalPages > 1 && (
            <Group justify="center">
              <Pagination total={totalPages} value={page} onChange={handlePageChange} />
            </Group>
          )}
        </>
      )}
    </Stack>
  );
}
