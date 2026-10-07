import {
  Autocomplete,
  Button,
  Checkbox,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import clsx from "clsx";
import { parseISO } from "date-fns";
import { useCallback } from "react";
import { boolean, enum as enum_, minLength, object, refine, string } from "zod/mini";
import type { UnreviewedTransaction } from "~/functions/getUnreviewedTransactions";
import type { RuleScope } from "~/lib/saveRule";
import { getCategoriesWithBalances } from "~/functions/getCategoriesWithBalances";
import { getVendorCategorySuggestions } from "~/functions/getVendorCategorySuggestions";
import { getVendors } from "~/functions/getVendors";
import { reviewTransaction } from "~/functions/reviewTransaction";
import { useCategorySplit } from "~/hooks/useCategorySplit";
import { useOpened } from "~/hooks/useOpened";
import { useServerFnData } from "~/hooks/useServerFnData";
import { activeCategories } from "~/lib/activeCategories";
import {
  CATEGORY_TOTAL_MISMATCH,
  categorySplitFields,
  splitTotalPennies,
} from "~/lib/categorySplit";
import { pluck } from "~/lib/collections";
import { dollarsToPennies, penniesToDollars } from "~/lib/currencyConversion";
import { formatSignedCurrency, fullDateFormatter } from "~/lib/formatters";

export interface ReviewTransactionModalProps {
  onClose: () => void;
  onSave: () => void;
  transaction: UnreviewedTransaction;
}

type Outcome = "categorize" | "dismiss";

export function ReviewTransactionModal({
  onClose,
  onSave,
  transaction,
}: ReviewTransactionModalProps) {
  const categories = useServerFnData(getCategoriesWithBalances) ?? [];
  const vendors = useServerFnData(getVendors) ?? [];
  const { close, modalProps } = useOpened({ onClose });

  const { suggestion } = transaction;
  const vendor = suggestion?.vendorAlias ?? transaction.vendor;
  const availableCategories = activeCategories(categories, transaction.date);
  const loadSuggestions = useCallback(
    ({ signal }: { signal: AbortSignal }) =>
      getVendorCategorySuggestions({ data: { vendor }, signal }),
    [vendor],
  );
  const availableCategoryIds = pluck(availableCategories, "id");
  const suggestions = useServerFnData(loadSuggestions)?.filter(({ categoryId }) =>
    availableCategoryIds.includes(categoryId),
  );

  const sign = transaction.amount < 0 ? -1 : 1;
  const totalPennies = Math.abs(transaction.amount);
  const totalDollars = penniesToDollars(totalPennies);
  const suggested = suggestion?.outcome;

  const initialOutcome: Outcome = suggested?.type === "dismiss" ? "dismiss" : "categorize";
  const suggestedSplits = suggested?.type === "categorize" ? suggested.splits : [];
  const suggestedRemember = !suggestion || suggested !== null;

  const formSchema = object({
    outcome: enum_(["categorize", "dismiss"]),
    vendor: string().check(minLength(1, "Vendor is required")),
    description: string(),
    ...categorySplitFields,
    updateAlias: boolean(),
    remember: boolean(),
    amountOnly: boolean(),
  }).check(
    refine(
      (values) =>
        values.outcome === "dismiss" || splitTotalPennies(values.categoryAmounts) === totalPennies,
      {
        message: CATEGORY_TOTAL_MISMATCH,
        path: ["categoryAmounts"],
      },
    ),
  );

  const validateCategorize = schemaResolver(formSchema, { sync: true });

  const form = useForm({
    validateInputOnBlur: true,
    initialValues: {
      outcome: initialOutcome,
      vendor,
      description: "",
      selectedCategoryIds: suggestedSplits.map(({ category }) => category.id),
      categoryAmounts: suggestedSplits.map(({ category, amount }) => ({
        categoryId: category.id,
        amount: penniesToDollars(Math.abs(amount)),
      })),
      updateAlias: true,
      remember: suggestedRemember,
      amountOnly: suggestion?.amountRule ?? false,
    },
    validate: (values) => (values.outcome === "dismiss" ? {} : validateCategorize(values)),
  });

  const { categorySelect, splitFields } = useCategorySplit({
    form,
    categories: availableCategories,
    total: totalDollars,
    suggestions,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const ruleScope: RuleScope = !values.remember
      ? "none"
      : values.amountOnly
        ? "amount"
        : "vendor";

    await reviewTransaction({
      data: {
        id: transaction.id,
        ruleScope,
        decision:
          values.outcome === "dismiss"
            ? { type: "dismiss" }
            : {
                type: "accept",
                vendor: values.vendor.trim(),
                description: values.description.trim() || undefined,
                updateAlias: values.updateAlias,
                splits: values.categoryAmounts.map(({ categoryId, amount }) => ({
                  categoryId,
                  amount: sign * dollarsToPennies(amount),
                })),
              },
      },
    });
    close();
    onSave();
  });

  const { outcome, selectedCategoryIds, remember } = form.getValues();
  const dismissing = outcome === "dismiss";
  const splitAcrossCategories = !dismissing && selectedCategoryIds.length > 1;

  return (
    <Modal {...modalProps} title={<Text fw="bold">Review Transaction</Text>}>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <div>
            <Text fw="bold">{vendor}</Text>
            <Group justify="space-between" wrap="nowrap">
              <Text c="dimmed">{fullDateFormatter.format(parseISO(transaction.date))}</Text>
              <Text
                className={clsx({ positive: transaction.amount >= 0 })}
                style={{ whiteSpace: "nowrap" }}
              >
                {formatSignedCurrency(transaction.amount)}
              </Text>
            </Group>
          </div>
          <TextInput label="Bank Vendor" value={transaction.vendor} disabled />
          <SegmentedControl
            fullWidth
            data={[
              { label: "Categorize", value: "categorize" },
              { label: "Dismiss", value: "dismiss" },
            ]}
            key={form.key("outcome")}
            {...form.getInputProps("outcome")}
            onChange={(value) => {
              const chosen: Outcome = value === "dismiss" ? "dismiss" : "categorize";
              form.setFieldValue("outcome", chosen);
              form.setFieldValue("remember", chosen === initialOutcome && suggestedRemember);
            }}
          />
          {!dismissing && (
            <>
              <Stack gap="xs">
                <Autocomplete
                  label="Vendor"
                  required
                  key={form.key("vendor")}
                  {...form.getInputProps("vendor")}
                  data={vendors}
                />
                <Checkbox
                  label="Remember this vendor name"
                  key={form.key("updateAlias")}
                  {...form.getInputProps("updateAlias", { type: "checkbox" })}
                />
              </Stack>
              <TextInput
                label="Description"
                key={form.key("description")}
                {...form.getInputProps("description")}
              />
              {categorySelect}
            </>
          )}
          <Stack gap="xs">
            <Checkbox
              label={
                dismissing
                  ? "Remember this dismissal"
                  : splitAcrossCategories
                    ? "Remember this category split"
                    : "Remember this category"
              }
              key={form.key("remember")}
              {...form.getInputProps("remember", { type: "checkbox" })}
            />
            {remember && !splitAcrossCategories && (
              <Checkbox
                ml="lg"
                label={`Only for ${formatSignedCurrency(transaction.amount)}`}
                key={form.key("amountOnly")}
                {...form.getInputProps("amountOnly", { type: "checkbox" })}
              />
            )}
          </Stack>
          {!dismissing && splitFields}
          <Group justify="flex-end">
            <Button
              type="submit"
              color={dismissing ? "red" : undefined}
              loading={form.submitting}
              disabled={!form.isValid()}
            >
              {dismissing ? "Dismiss" : "Accept"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
