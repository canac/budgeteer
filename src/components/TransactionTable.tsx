import { Table, Text } from "@mantine/core";
import { format } from "date-fns";
import type { Transaction } from "generated/prisma/client";
import { formatCurrency } from "~/lib/formatCurrency";
import classes from "./TransactionTable.module.css";

interface TransactionTableProps {
  transactions: Array<
    Pick<Transaction, "id" | "date" | "vendor" | "description" | "amount">
  >;
  startingBalance: number;
  startingBalanceDate: Date;
}

export function TransactionTable({
  transactions,
  startingBalance,
  startingBalanceDate,
}: TransactionTableProps) {
  return (
    <div>
      <Text fw={500} size="lg">
        Transactions
      </Text>
      <Table striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            <Table.Th>Vendor</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th ta="right">Amount</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {transactions.map((transaction) => (
            <Table.Tr key={transaction.id}>
              <Table.Td>{format(transaction.date, "MMM dd")}</Table.Td>
              <Table.Td>{transaction.vendor}</Table.Td>
              <Table.Td>{transaction.description}</Table.Td>
              <Table.Td
                ta="right"
                c={transaction.amount < 0 ? undefined : "green"}
              >
                {formatCurrency(transaction.amount)}
              </Table.Td>
            </Table.Tr>
          ))}
          <Table.Tr className={classes.startingBalanceRow}>
            <Table.Td>{format(startingBalanceDate, "MMM dd")}</Table.Td>
            <Table.Td>Starting Balance</Table.Td>
            <Table.Td></Table.Td>
            <Table.Td ta="right" c={startingBalance < 0 ? "red" : "green"}>
              {formatCurrency(startingBalance)}
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </div>
  );
}
