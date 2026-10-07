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
import { acknowledgeTransactionChange as acknowledgeTransactionChangeFn } from "~/functions/acknowledgeTransactionChange";
import { getExternalAccounts } from "~/functions/getExternalAccounts";
import {
  getUnreviewedTransactions,
  type UnreviewedTransaction,
} from "~/functions/getUnreviewedTransactions";
import { importTransactions as importTransactionsFn } from "~/functions/importTransactions";
import { reconcileTransaction as reconcileTransactionFn } from "~/functions/reconcileTransaction";
import { restoreTransaction as restoreTransactionFn } from "~/functions/restoreTransaction";
import { reviewTransaction as reviewTransactionFn } from "~/functions/reviewTransaction";
import { useSyncedState } from "~/hooks/useSyncedState";
import "./ImportPage.css";

const PAGE_SIZE = 25;

type View = "unreviewed" | "changed" | "dismissed";

const searchSchema = object({
  page: optional(coerce.number()),
  view: optional(union([literal("unreviewed"), literal("changed"), literal("dismissed")])),
  account: optional(string()),
});

function header(view: View, total: number): string {
  const plural = total === 1 ? "" : "s";
  const headers: Record<View, string> = {
    unreviewed: `You have ${total} transaction${plural} pending review`,
    changed: `${total} accepted transaction${plural} changed at the bank`,
    dismissed: `${total} dismissed transaction${plural}`,
  };
  return headers[view];
}

function empty(view: View, filteredByAccount: boolean): string {
  const messages: Record<View, string> = {
    unreviewed: "No unreviewed transactions",
    changed: "No changed transactions",
    dismissed: "No dismissed transactions",
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
  const reviewTransaction = useServerFn(reviewTransactionFn);
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

  const reviewOptimistically = async (id: string, action: () => Promise<unknown>) => {
    removeTransaction(id);
    try {
      await action();
    } catch {
    } finally {
      await router.invalidate();
    }
  };

  const handleAccept = async (transaction: UnreviewedTransaction) => {
    const { suggestion } = transaction;
    const suggested = suggestion?.outcome;
    if (suggested?.type !== "categorize") {
      return;
    }

    await reviewOptimistically(transaction.id, () =>
      reviewTransaction({
        data: {
          id: transaction.id,
          decision: {
            type: "accept",
            vendor: suggestion?.vendorAlias ?? transaction.vendor,
            updateAlias: false,
            splits: suggested.splits.map(({ category, amount }) => ({
              categoryId: category.id,
              amount,
            })),
          },
        },
      }),
    );
  };

  const handleDismissed = async (id: string) =>
    reviewOptimistically(id, () =>
      reviewTransaction({ data: { id, decision: { type: "dismiss" } } }),
    );

  const handleAcknowledge = async (id: string) =>
    reviewOptimistically(id, () => acknowledgeTransactionChange({ data: { id } }));

  const handleReconcile = async (transaction: UnreviewedTransaction) => {
    // Splits can't be reconciled automatically; open the modal so the user redistributes them.
    if ((transaction.transaction?.transactionCategories.length ?? 0) > 1) {
      setReconciling(transaction);
      return;
    }

    await reviewOptimistically(transaction.id, () =>
      reconcileTransaction({ data: { id: transaction.id } }),
    );
  };

  const handleReviewed = async (id: string) => {
    removeTransaction(id);
    await router.invalidate();
  };

  const handleRestore = async (id: string) =>
    reviewOptimistically(id, () => restoreTransaction({ data: { id } }));

  const handlePageChange = async (newPage: number) => {
    await navigate({ search: (prev) => ({ ...prev, page: newPage }) });
  };

  const handleViewChange = async (value: string) => {
    const next: View | undefined =
      value === "changed" ? "changed" : value === "dismissed" ? "dismissed" : undefined;
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
          { label: "Dismissed", value: "dismissed" },
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
            onDismissed={handleDismissed}
            onAcknowledge={handleAcknowledge}
            onReconcile={handleReconcile}
            onReviewed={handleReviewed}
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
