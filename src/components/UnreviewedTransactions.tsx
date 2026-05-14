import { ActionIcon, Table } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck, IconEdit, IconX } from "@tabler/icons-react";
import { parseISO } from "date-fns";
import { useState } from "react";
import { DynamicImportTransactionModal } from "~/components/DynamicImportTransactionModal";
import { formatCurrency, shortDateFormatter } from "~/lib/formatters";
import { formatTellerVendor } from "~/lib/teller/formatVendor";
import "./UnreviewedTransactions.css";

interface Transaction {
  id: string;
  date: string;
  vendor: string;
  amount: number;
  account: { name: string };
  rule: {
    vendor: string;
    category: { id: string; name: string } | null;
  } | null;
}

interface UnreviewedTransactionsProps {
  transactions: Transaction[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string) => void;
}

export function UnreviewedTransactions({
  transactions,
  onAccept,
  onReject,
  onEdit,
}: UnreviewedTransactionsProps) {
  const [modalOpen, { open, close }] = useDisclosure(false);
  const [importingTransaction, setImportingTransaction] = useState<Transaction | undefined>(
    undefined,
  );

  const openImport = (transaction: Transaction) => {
    setImportingTransaction(transaction);
    open();
  };

  const handleImport = () => {
    if (importingTransaction) {
      onEdit(importingTransaction.id);
    }
  };

  return (
    <>
      <Table className="UnreviewedTransactions" striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            <Table.Th>Vendor</Table.Th>
            <Table.Th>Category</Table.Th>
            <Table.Th>Account</Table.Th>
            <Table.Th ta="right">Amount</Table.Th>
            <Table.Th ta="center">Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {transactions.map((transaction) => (
            <Table.Tr key={transaction.id}>
              <Table.Td>{shortDateFormatter.format(parseISO(transaction.date))}</Table.Td>
              <Table.Td className="wrap" fs={transaction.rule ? undefined : "italic"}>
                {transaction.rule?.vendor ?? transaction.vendor}
              </Table.Td>
              <Table.Td>{transaction.rule?.category?.name}</Table.Td>
              <Table.Td>{transaction.account.name}</Table.Td>
              <Table.Td ta="right" c={transaction.amount < 0 ? undefined : "green"}>
                {formatCurrency(transaction.amount)}
              </Table.Td>
              <Table.Td ta="center">
                <ActionIcon
                  variant="subtle"
                  color="green"
                  aria-label="Accept"
                  onClick={() => onAccept(transaction.id)}
                >
                  <IconCheck />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  aria-label="Edit"
                  onClick={() => openImport(transaction)}
                >
                  <IconEdit />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label="Reject"
                  onClick={() => onReject(transaction.id)}
                >
                  <IconX />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {modalOpen && importingTransaction && (
        <DynamicImportTransactionModal
          onClose={close}
          onSave={handleImport}
          transaction={{
            id: importingTransaction.id,
            amount: importingTransaction.amount,
            tellerVendor: importingTransaction.vendor,
            vendor:
              importingTransaction.rule?.vendor ?? formatTellerVendor(importingTransaction.vendor),
            categoryId: importingTransaction.rule?.category?.id ?? null,
          }}
        />
      )}
    </>
  );
}
