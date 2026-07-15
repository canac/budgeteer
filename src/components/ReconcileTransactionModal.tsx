import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { object, refine } from "zod/mini";
import type { UnreviewedTransaction } from "~/functions/getUnreviewedTransactions";
import { getCategoriesWithBalances } from "~/functions/getCategoriesWithBalances";
import { reconcileTransaction } from "~/functions/reconcileTransaction";
import { useCategorySplit } from "~/hooks/useCategorySplit";
import { useOpened } from "~/hooks/useOpened";
import { useServerFnData } from "~/hooks/useServerFnData";
import {
  CATEGORY_TOTAL_MISMATCH,
  categorySplitFields,
  splitTotalPennies,
} from "~/lib/categorySplit";
import { dollarsToPennies, penniesToDollars } from "~/lib/currencyConversion";
import { formatCurrency } from "~/lib/formatters";

export interface ReconcileTransactionModalProps {
  onClose: () => void;
  onSave: () => void;
  transaction: UnreviewedTransaction;
}

export function ReconcileTransactionModal({
  onClose,
  onSave,
  transaction,
}: ReconcileTransactionModalProps) {
  const categories = useServerFnData(getCategoriesWithBalances) ?? [];
  const { close, modalProps } = useOpened({ onClose });

  const sign = transaction.amount < 0 ? -1 : 1;
  const totalPennies = Math.abs(transaction.amount);
  const totalDollars = penniesToDollars(totalPennies);
  const existingCategories = transaction.transaction?.transactionCategories ?? [];

  const formSchema = object(categorySplitFields).check(
    refine((values) => splitTotalPennies(values.categoryAmounts) === totalPennies, {
      message: CATEGORY_TOTAL_MISMATCH,
      path: ["categoryAmounts"],
    }),
  );

  const form = useForm({
    validateInputOnBlur: true,
    initialValues: {
      selectedCategoryIds: existingCategories.map((category) => category.categoryId),
      categoryAmounts: existingCategories.map((category) => ({
        categoryId: category.categoryId,
        amount: penniesToDollars(Math.abs(category.amount)),
      })),
    },
    validate: schemaResolver(formSchema, { sync: true }),
  });

  const { categorySelect, splitFields } = useCategorySplit({
    form,
    categories,
    total: totalDollars,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    await reconcileTransaction({
      data: {
        id: transaction.id,
        categories: values.categoryAmounts.map(({ categoryId, amount }) => ({
          categoryId,
          amount: sign * dollarsToPennies(amount),
        })),
      },
    });
    close();
    onSave();
  });

  return (
    <Modal {...modalProps} title={<Text fw="bold">Reconcile Transaction</Text>}>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="sm">
            The bank now reports{" "}
            <Text span fw={700}>
              {formatCurrency(transaction.amount)}
            </Text>{" "}
            for this transaction. Reassign the category amounts to match the new total.
          </Text>
          {categorySelect}
          {splitFields}
          <Group justify="flex-end">
            <Button type="submit" loading={form.submitting} disabled={!form.isValid()}>
              Reconcile
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
