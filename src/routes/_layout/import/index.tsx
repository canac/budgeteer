import { Button, Group, Pagination, SegmentedControl, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconDownload } from "@tabler/icons-react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { coerce, literal, object, optional, string, union } from "zod/mini";
import { DynamicReconcileTransactionModal } from "~/components/DynamicReconcileTransactionModal";
import { ExternalAccountSelect } from "~/components/ExternalAccountSelect";
import { UnreviewedTransactions } from "~/components/UnreviewedTransactions";
import { acceptTransaction as acceptTransactionFn } from "~/functions/acceptTransaction";
import { acknowledgeTransactionChange as acknowledgeTransactionChangeFn } from "~/functions/acknowledgeTransactionChange";
import { getExternalAccounts } from "~/functions/getExternalAccounts";
import {
  getUnreviewedTransactions,
  type UnreviewedTransaction,
} from "~/functions/getUnreviewedTransactions";
import { importTransactions as importTransactionsFn } from "~/functions/importTransactions";
import { reconcileTransaction as reconcileTransactionFn } from "~/functions/reconcileTransaction";
import { rejectTransaction as rejectTransactionFn } from "~/functions/rejectTransaction";
import { restoreTransaction as restoreTransactionFn } from "~/functions/restoreTransaction";
import { useSyncedState } from "~/hooks/useSyncedState";
import "./ImportPage.css";

const PAGE_SIZE = 25;

type View = "unreviewed" | "changed" | "rejected";

const searchSchema = object({
  page: optional(coerce.number()),
  view: optional(union([literal("unreviewed"), literal("changed"), literal("rejected")])),
  account: optional(string()),
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

function empty(view: View, filteredByAccount: boolean): string {
  const messages: Record<View, string> = {
    unreviewed: "No unreviewed transactions",
    changed: "No changed transactions",
    rejected: "No rejected transactions",
  };
  return `${messages[view]}${filteredByAccount ? " for this account" : ""}.`;
}

export const Route = createFileRoute("/_layout/import/")({
  component: ImportTransactionsPage,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { page, view, account } }) => ({ page, view, account }),
  loader: async ({ deps: { page, view, account } }) => {
    const [{ transactions, total }, accounts] = await Promise.all([
      getUnreviewedTransactions({
        data: { page, pageSize: PAGE_SIZE, view: view ?? "unreviewed", accountId: account },
      }),
      getExternalAccounts(),
    ]);
    return { transactions, total, accounts };
  },
  head: () => ({ meta: [{ title: "Import Transactions | Budgeteer" }] }),
});

function ImportTransactionsPage() {
  const router = useRouter();
  const { accounts, ...loaderData } = Route.useLoaderData();
  const { page, view, account } = Route.useSearch();
  const currentView: View = view ?? "unreviewed";
  const navigate = useNavigate({ from: Route.fullPath });
  const importTransactions = useServerFn(importTransactionsFn);
  const acceptTransaction = useServerFn(acceptTransactionFn);
  const rejectTransaction = useServerFn(rejectTransactionFn);
  const acknowledgeTransactionChange = useServerFn(acknowledgeTransactionChangeFn);
  const reconcileTransaction = useServerFn(reconcileTransactionFn);
  const restoreTransaction = useServerFn(restoreTransactionFn);
  const [importing, setImporting] = useState(false);
  const [reconciling, setReconciling] = useState<UnreviewedTransaction | null>(null);

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

  const handleReconcile = async (transaction: UnreviewedTransaction) => {
    // Splits can't be reconciled automatically; open the modal so the user redistributes them.
    if ((transaction.transaction?.transactionCategories.length ?? 0) > 1) {
      setReconciling(transaction);
      return;
    }
    removeTransaction(transaction.id);
    await reconcileTransaction({ data: { id: transaction.id } });
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

  const handleAccountChange = async (accountId: string | null) => {
    await navigate({
      search: (prev) => ({ ...prev, account: accountId ?? undefined, page: undefined }),
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Stack className="ImportPage" gap="md">
      <Group justify="space-between">
        <Text className="header">{header(currentView, total)}</Text>
        <Button leftSection={<IconDownload />} onClick={handleImport} loading={importing}>
          Import
        </Button>
      </Group>
      <SegmentedControl
        fullWidth
        value={currentView}
        onChange={handleViewChange}
        data={[
          { label: "Unreviewed", value: "unreviewed" },
          { label: "Changed", value: "changed" },
          { label: "Rejected", value: "rejected" },
        ]}
      />
      {accounts.length > 0 && (
        <ExternalAccountSelect
          accounts={accounts}
          value={account ?? null}
          onChange={handleAccountChange}
        />
      )}
      {total === 0 ? (
        <Text c="dimmed">{empty(currentView, !!account)}</Text>
      ) : (
        <>
          <UnreviewedTransactions
            transactions={transactions}
            onAccept={handleAccept}
            onReject={handleReject}
            onAcknowledge={handleAcknowledge}
            onReconcile={handleReconcile}
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
      {reconciling && (
        <DynamicReconcileTransactionModal
          transaction={reconciling}
          onClose={() => setReconciling(null)}
          onSave={() => {
            removeTransaction(reconciling.id);
            void router.invalidate();
          }}
        />
      )}
    </Stack>
  );
}
