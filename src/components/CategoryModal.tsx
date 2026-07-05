import {
  Alert,
  Button,
  Fieldset,
  Group,
  Modal,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { IconPigMoney, IconWallet } from "@tabler/icons-react";
import { useState } from "react";
import { extractErrorMessage } from "src/lib/error";
import { boolean, minLength, object, string } from "zod/mini";
import { createCategory } from "~/functions/createCategory";
import { updateCategory } from "~/functions/updateCategory";
import { useOpened } from "~/hooks/useOpened";

interface EditCategory {
  id: string;
  name: string;
  accumulating: boolean;
  flexible: boolean;
}

export interface CategoryModalProps {
  onClose: () => void;
  onSave: () => void;
  month: string;
  editingCategory?: EditCategory;
}

const formSchema = object({
  name: string().check(minLength(1, "Name is required")),
  accumulating: boolean(),
  flexible: boolean(),
});

export function CategoryModal({ onClose, onSave, month, editingCategory }: CategoryModalProps) {
  const { close, modalProps } = useOpened({ onClose });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditing = !!editingCategory;

  const form = useForm({
    validateInputOnBlur: true,
    initialValues: isEditing
      ? {
          name: editingCategory.name,
          accumulating: editingCategory.accumulating,
          flexible: editingCategory.flexible,
        }
      : {
          name: "",
          accumulating: false,
          flexible: false,
        },
    validate: schemaResolver(formSchema, { sync: true }),
  });

  const handleSubmit = form.onSubmit(async (values) => {
    try {
      if (isEditing) {
        await updateCategory({
          data: {
            categoryId: editingCategory.id,
            name: values.name,
            accumulating: values.accumulating,
            flexible: values.flexible,
          },
        });
      } else {
        await createCategory({
          data: {
            month,
            name: values.name,
            accumulating: values.accumulating,
            flexible: values.flexible,
          },
        });
      }
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
      return;
    }

    form.reset();
    close();
    onSave();
  });

  return (
    <Modal
      {...modalProps}
      title={<Text fw="bold">{isEditing ? "Edit Category" : "New Category"}</Text>}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Name"
            data-autofocus
            key={form.key("name")}
            {...form.getInputProps("name")}
            required
          />
          <Fieldset
            legend={
              <Text span fw={600}>
                Type
              </Text>
            }
            radius="md"
          >
            <Stack gap="sm">
              <Switch
                label={
                  <Group gap={6}>
                    <IconPigMoney size={16} stroke={1.5} />
                    Accumulating
                  </Group>
                }
                key={form.key("accumulating")}
                {...form.getInputProps("accumulating", { type: "checkbox" })}
              />
              <Switch
                label={
                  <Group gap={6}>
                    <IconWallet size={16} stroke={1.5} />
                    Flexible
                  </Group>
                }
                key={form.key("flexible")}
                {...form.getInputProps("flexible", { type: "checkbox" })}
              />
            </Stack>
          </Fieldset>
          {errorMessage !== null && <Alert color="red">{errorMessage}</Alert>}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={form.submitting} disabled={!form.isValid()}>
              {isEditing ? "Update" : "Save"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
