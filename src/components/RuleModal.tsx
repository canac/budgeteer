import { Button, Group, Modal, Radio, Select, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import invariant from "tiny-invariant";
import type { AmountRule, RuleOutcome, VendorRules } from "~/lib/ruleLookup";
import { getCategoriesWithBalances } from "~/functions/getCategoriesWithBalances";
import { updateRule } from "~/functions/updateRule";
import { useCategorySplit } from "~/hooks/useCategorySplit";
import { useOpened } from "~/hooks/useOpened";
import { useServerFnData } from "~/hooks/useServerFnData";
import { activeCategories } from "~/lib/activeCategories";
import { CATEGORY_TOTAL_MISMATCH, splitTotalPennies } from "~/lib/categorySplit";
import { pluck } from "~/lib/collections";
import { dollarsToPennies, penniesToDollars } from "~/lib/currencyConversion";
import { formatSignedCurrency } from "~/lib/formatters";

export type RuleDraft =
  | { scope: "vendor"; rule: VendorRules }
  | { scope: "amount"; externalVendor: string; rule: AmountRule };

export interface RuleModalProps {
  onClose: () => void;
  onSave: () => void;
  draft: RuleDraft;
}

export function RuleModal({ onClose, onSave, draft }: RuleModalProps) {
  const categories = useServerFnData(getCategoriesWithBalances) ?? [];
  const { close, modalProps } = useOpened({ onClose });

  const amountDraft = draft.scope === "amount" ? draft : null;
  const externalVendor =
    draft.scope === "vendor" ? draft.rule.externalVendor : draft.externalVendor;
  const sign = amountDraft && amountDraft.rule.amount < 0 ? -1 : 1;
  const totalPennies = amountDraft ? Math.abs(amountDraft.rule.amount) : 0;
  const totalDollars = penniesToDollars(totalPennies);
  const amountOutcome = amountDraft?.rule.outcome;
  const vendorRule = draft.scope === "vendor" ? draft.rule.vendorRule : null;
  const splits =
    amountOutcome?.type === "categorize"
      ? amountOutcome.splits.map(({ category, amount }) => ({ categoryId: category.id, amount }))
      : [];
  const initialOutcome: RuleOutcome["type"] | "none" =
    (amountOutcome ?? vendorRule)?.type ?? "none";

  const form = useForm({
    initialValues: {
      vendor: draft.scope === "vendor" ? (draft.rule.vendorAlias ?? "") : "",
      outcome: initialOutcome,
      categoryId:
        vendorRule?.type === "categorize" ? (vendorRule.splits[0]?.category.id ?? null) : null,
      selectedCategoryIds: pluck(splits, "categoryId"),
      categoryAmounts: splits.map(({ categoryId, amount }) => ({
        categoryId,
        amount: penniesToDollars(Math.abs(amount)),
      })),
    },
    validate: {
      vendor: (value, values) =>
        !amountDraft && values.outcome === "none" && !value.trim() ? "Vendor is required" : null,
      categoryId: (value, values) =>
        !amountDraft && values.outcome === "categorize" && !value ? "Category is required" : null,
      selectedCategoryIds: (value, values) =>
        amountDraft && values.outcome === "categorize" && value.length === 0
          ? "At least one category is required"
          : null,
      categoryAmounts: (value, values) =>
        amountDraft && values.outcome === "categorize" && splitTotalPennies(value) !== totalPennies
          ? CATEGORY_TOTAL_MISMATCH
          : null,
    },
  });

  const { categorySelect, splitFields } = useCategorySplit({
    form,
    categories: activeCategories(categories, new Date().toISOString().slice(0, 7)),
    total: totalDollars,
  });

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const handleSubmit = form.onSubmit(async (values) => {
    if (amountDraft) {
      invariant(values.outcome !== "none", "Amount rules always have an outcome");
      await updateRule({
        data: {
          scope: "amount",
          id: amountDraft.rule.id,
          outcome:
            values.outcome === "dismiss"
              ? { type: "dismiss" }
              : {
                  type: "categorize",
                  splits: values.categoryAmounts.map(({ categoryId, amount }) => ({
                    categoryId,
                    amount: sign * dollarsToPennies(amount),
                  })),
                },
        },
      });
    } else {
      await updateRule({
        data: {
          scope: "vendor",
          externalVendor,
          vendor: values.vendor.trim() || null,
          outcome:
            values.outcome === "dismiss"
              ? { type: "dismiss" }
              : values.outcome === "none"
                ? { type: "none" }
                : { type: "categorize", categoryId: values.categoryId! },
        },
      });
    }
    close();
    onSave();
  });

  const { outcome } = form.getValues();
  const categorizing = outcome === "categorize";

  return (
    <Modal
      {...modalProps}
      title={<Text fw="bold">{amountDraft ? "Edit Amount Rule" : "Edit Rule"}</Text>}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput label="Bank Vendor" value={externalVendor} disabled />
          {amountDraft ? (
            <TextInput
              label="Amount"
              value={formatSignedCurrency(amountDraft.rule.amount)}
              disabled
            />
          ) : (
            <TextInput
              label="Vendor"
              description="Default vendor name of imported transactions"
              required={outcome === "none"}
              key={form.key("vendor")}
              {...form.getInputProps("vendor")}
            />
          )}
          <Radio.Group label="Outcome" key={form.key("outcome")} {...form.getInputProps("outcome")}>
            <Stack gap="xs" mt="xs">
              {!amountDraft && <Radio value="none" label="Rename only" />}
              <Radio value="categorize" label="Categorize" />
              <Radio value="dismiss" label="Dismiss" />
            </Stack>
          </Radio.Group>
          {categorizing &&
            (amountDraft ? (
              <>
                {categorySelect}
                {splitFields}
              </>
            ) : (
              <Select
                label="Category"
                description="Default category of imported transactions"
                data={categoryOptions}
                required
                searchable
                key={form.key("categoryId")}
                {...form.getInputProps("categoryId")}
              />
            ))}
          <Group justify="flex-end">
            <Button type="submit" loading={form.submitting} disabled={!form.isValid()}>
              Update
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
