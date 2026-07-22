import {
  Autocomplete,
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { boolean, minLength, object, refine, string } from "zod/mini";
import type { UnreviewedTransaction } from "~/functions/getUnreviewedTransactions";
import { acceptTransaction } from "~/functions/acceptTransaction";
import { getCategoriesWithBalances } from "~/functions/getCategoriesWithBalances";
import { getVendors } from "~/functions/getVendors";
import { useCategorySplit } from "~/hooks/useCategorySplit";
import { useOpened } from "~/hooks/useOpened";
import { useServerFnData } from "~/hooks/useServerFnData";
import {
  CATEGORY_TOTAL_MISMATCH,
  categorySplitFields,
  splitTotalPennies,
} from "~/lib/categorySplit";
import { dollarsToPennies, penniesToDollars } from "~/lib/currencyConversion";

export interface ImportTransactionModalProps {
  onClose: () => void;
  onSave: () => void;
  transaction: UnreviewedTransaction;
}

export function ImportTransactionModal({
  onClose,
  onSave,
  transaction,
}: ImportTransactionModalProps) {
  const categories = useServerFnData(getCategoriesWithBalances) ?? [];
  const vendors = useServerFnData(getVendors) ?? [];
  const { close, modalProps } = useOpened({ onClose });

  const sign = transaction.amount < 0 ? -1 : 1;
  const totalPennies = Math.abs(transaction.amount);
  const totalDollars = penniesToDollars(totalPennies);

  const formSchema = object({
    vendor: string().check(minLength(1, "Vendor is required")),
    description: string(),
    ...categorySplitFields,
    updateRuleVendor: boolean(),
    updateRuleCategory: boolean(),
  }).check(
    refine((values) => splitTotalPennies(values.categoryAmounts) === totalPennies, {
      message: CATEGORY_TOTAL_MISMATCH,
      path: ["categoryAmounts"],
    }),
  );

  const form = useForm({
    validateInputOnBlur: true,
    initialValues: {
      vendor: transaction.rule?.vendor ?? transaction.vendor,
      description: "",
      selectedCategoryIds: transaction.rule?.category ? [transaction.rule.category.id] : [],
      categoryAmounts: transaction.rule?.category
        ? [{ categoryId: transaction.rule.category.id, amount: totalDollars }]
        : [],
      updateRuleVendor: true,
      updateRuleCategory: transaction.rule?.category !== null,
    },
    validate: schemaResolver(formSchema, { sync: true }),
  });

  const { categorySelect, splitFields } = useCategorySplit({
    form,
    categories,
    total: totalDollars,
    onCategoryChange: (value) => {
      if (value.length !== 1) {
        form.setFieldValue("updateRuleCategory", false);
      }
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    await acceptTransaction({
      data: {
        id: transaction.id,
        override: {
          vendor: values.vendor.trim(),
          description: values.description.trim() || undefined,
          categories: values.categoryAmounts.map(({ categoryId, amount }) => ({
            categoryId,
            amount: sign * dollarsToPennies(amount),
          })),
          updateRuleVendor: values.updateRuleVendor,
          updateRuleCategory: values.updateRuleCategory,
        },
      },
    });
    close();
    onSave();
  });

  const { selectedCategoryIds } = form.getValues();
  const singleCategory = selectedCategoryIds.length === 1;

  return (
    <Modal {...modalProps} title={<Text fw="bold">Import Transaction</Text>}>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput label="Bank Vendor" value={transaction.vendor} disabled />
          <Stack gap="xs">
            <Autocomplete
              label="Vendor"
              required
              key={form.key("vendor")}
              {...form.getInputProps("vendor")}
              data={vendors}
            />
            <Checkbox
              label="Update rule vendor"
              key={form.key("updateRuleVendor")}
              {...form.getInputProps("updateRuleVendor", { type: "checkbox" })}
            />
          </Stack>
          <TextInput
            label="Description"
            key={form.key("description")}
            {...form.getInputProps("description")}
          />
          <Stack gap="xs">
            {categorySelect}
            <Checkbox
              label="Update rule category"
              disabled={!singleCategory}
              key={form.key("updateRuleCategory")}
              {...form.getInputProps("updateRuleCategory", { type: "checkbox" })}
            />
          </Stack>
          {splitFields}
          <Group justify="flex-end">
            <Button type="submit" loading={form.submitting} disabled={!form.isValid()}>
              Accept
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
