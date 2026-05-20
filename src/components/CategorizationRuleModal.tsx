import { Button, Group, Modal, Select, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { getCategories } from "~/functions/getCategories";
import { updateCategorizationRule } from "~/functions/updateCategorizationRule";
import { useOpened } from "~/hooks/useOpened";
import { useServerFnData } from "~/hooks/useServerFnData";

interface EditRule {
  id: string;
  tellerVendor: string;
  vendor: string;
  categoryId: string | null;
}

export interface CategorizationRuleModalProps {
  onClose: () => void;
  onSave: () => void;
  editingRule: EditRule;
}

export function CategorizationRuleModal({
  onClose,
  onSave,
  editingRule,
}: CategorizationRuleModalProps) {
  const categories = useServerFnData(getCategories) ?? [];
  const { close, modalProps } = useOpened({ onClose });

  const form = useForm({
    initialValues: {
      vendor: editingRule.vendor,
      categoryId: editingRule.categoryId,
    },
  });

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const handleSubmit = form.onSubmit(async (values) => {
    await updateCategorizationRule({
      data: {
        id: editingRule.id,
        vendor: values.vendor.trim(),
        categoryId: values.categoryId,
      },
    });
    close();
    onSave();
  });

  return (
    <Modal {...modalProps} title={<Text fw="bold">Edit Rule</Text>}>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput label="Teller Vendor" value={editingRule.tellerVendor} disabled />
          <TextInput
            label="Vendor"
            description="Default vendor name of imported transactions"
            required
            key={form.key("vendor")}
            {...form.getInputProps("vendor")}
          />
          <Select
            label="Category"
            description="Default category of imported transactions"
            data={categoryOptions}
            key={form.key("categoryId")}
            {...form.getInputProps("categoryId")}
            clearable
            searchable
          />
          <Group justify="flex-end">
            <Button type="submit" loading={form.submitting}>
              Update
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
