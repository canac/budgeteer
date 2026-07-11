import { Button, Group, Pagination, SegmentedControl, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconDownload } from "@tabler/icons-react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { coerce, literal, object, optional, union } from "zod/mini";
import { UnreviewedTransactions } from "~/components/UnreviewedTransactions";
import { acceptTransaction as acceptTransactionFn } from "~/functions/acceptTransaction";
import { acknowledgeTransactionChange as acknowledgeTransactionChangeFn } from "~/functions/acknowledgeTransactionChange";
import { getUnreviewedTransactions } from "~/functions/getUnreviewedTransactions";
import { importTransactions as importTransactionsFn } from "~/functions/importTransactions";
import { rejectTransaction as rejectTransactionFn } from "~/functions/rejectTransaction";
import { restoreTransaction as restoreTransactionFn } from "~/functions/restoreTransaction";
import { useSyncedState } from "~/hooks/useSyncedState";

const PAGE_SIZE = 25;

type View = "unreviewed" | "changed" | "rejected";

const searchSchema = object({
  page: optional(coerce.number()),
  view: optional(union([literal("unreviewed"), literal("changed"), literal("rejected")])),
});

function header(view: View, total: number): string {
  const plural = total === 1 ? "" : "s";
  const headers: Record<View, string> = {
    unreviewed: `You have ${total} transaction${plural} pending review`,
    changed: `${total} accepted transaction${plural} changed at the bank`,
    rejected: `${total} rejected transaction${plural}`,
  };
  return headers[view];
}

function empty(view: View): string {
  const messages: Record<View, string> = {
    unreviewed: "No unreviewed transactions.",
    changed: "No changed transactions.",
    rejected: "No rejected transactions.",
  };
  return messages[view];
}

export const Route = createFileRoute("/_layout/import/")({
  component: ImportTransactionsPage,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { page, view } }) => ({ page, view }),
  loader: ({ deps: { page, view } }) =>
    getUnreviewedTransactions({ data: { page, pageSize: PAGE_SIZE, view: view ?? "unreviewed" } }),
  head: () => ({ meta: [{ title: "Import Transactions | Budgeteer" }] }),
});

function ImportTransactionsPage() {
  const router = useRouter();
  const loaderData = Route.useLoaderData();
  const { page, view } = Route.useSearch();
  const currentView: View = view ?? "unreviewed";
  const navigate = useNavigate({ from: Route.fullPath });
  const importTransactions = useServerFn(importTransactionsFn);
  const acceptTransaction = useServerFn(acceptTransactionFn);
  const rejectTransaction = useServerFn(rejectTransactionFn);
  const acknowledgeTransactionChange = useServerFn(acknowledgeTransactionChangeFn);
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
      const { imported, failed } = await importTransactions();
      notifications.show({
        title: failed ? "Import finished with errors" : "Import completed",
        message:
          `Imported ${imported} new transaction${imported === 1 ? "" : "s"}.` +
          (failed ? ` ${failed} connection${failed === 1 ? "" : "s"} failed to sync.` : ""),
        color: failed ? "yellow" : "green",
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

  const handleAcknowledge = async (id: string) => {
    removeTransaction(id);
    await acknowledgeTransactionChange({ data: { id } });
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

  const handleViewChange = async (value: string) => {
    const next: View | undefined =
      value === "changed" ? "changed" : value === "rejected" ? "rejected" : undefined;
    await navigate({
      search: (prev) => ({ ...prev, view: next, page: undefined }),
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text>{header(currentView, total)}</Text>
        <Group>
          <SegmentedControl
            value={currentView}
            onChange={handleViewChange}
            data={[
              { label: "Unreviewed", value: "unreviewed" },
              { label: "Changed", value: "changed" },
              { label: "Rejected", value: "rejected" },
            ]}
          />
          <Button leftSection={<IconDownload />} onClick={handleImport} loading={importing}>
            Import Transactions
          </Button>
        </Group>
      </Group>
      {total === 0 ? (
        <Text c="dimmed">{empty(currentView)}</Text>
      ) : (
        <>
          <UnreviewedTransactions
            transactions={transactions}
            onAccept={handleAccept}
            onReject={handleReject}
            onAcknowledge={handleAcknowledge}
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
