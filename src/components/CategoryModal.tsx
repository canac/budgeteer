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
  Tooltip,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { IconPigMoney, IconWallet } from "@tabler/icons-react";
import { useState } from "react";
import { extractErrorMessage } from "src/lib/error";
import { boolean, minLength, object, string } from "zod/mini";
import {
  DynamicDeleteCategoryModal,
  preloadDeleteCategoryModal,
} from "~/components/DynamicDeleteCategoryModal";
import { ModalFooter } from "~/components/ModalFooter";
import { createCategory } from "~/functions/createCategory";
import { updateCategory } from "~/functions/updateCategory";
import { useConfirmDelete } from "~/hooks/useConfirmDelete";
import { useOpened } from "~/hooks/useOpened";
import { preloadOnHover } from "~/lib/preloadOnHover";

interface EditCategory {
  id: string;
  name: string;
  accumulating: boolean;
  flexible: boolean;
}

export type Deletable = { valid: true } | { valid: false; message: string };

export interface CategoryModalProps {
  onClose: () => void;
  onSave: () => void;
  month: string;
  editingCategory?: EditCategory;
  deletable?: Deletable;
  onDelete?: () => void;
}

const formSchema = object({
  name: string().check(minLength(1, "Name is required")),
  accumulating: boolean(),
  flexible: boolean(),
});

export function CategoryModal({
  onClose,
  onSave,
  month,
  editingCategory,
  deletable,
  onDelete,
}: CategoryModalProps) {
  const { close, modalProps } = useOpened({ onClose });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deletion = useConfirmDelete({ close, onDelete });

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
      {...deletion.modalProps}
      title={<Text fw="bold">{isEditing ? "Edit Category" : "New Category"}</Text>}
    >
      <form onSubmit={handleSubmit}>
        <Stack>
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
          <ModalFooter>
            {deletable && (
              <Tooltip label={!deletable.valid && deletable.message} disabled={deletable.valid}>
                <Button
                  color="red"
                  data-disabled={!deletable.valid || undefined}
                  {...(deletable.valid && preloadOnHover(preloadDeleteCategoryModal))}
                  onClick={() => deletable.valid && deletion.confirm()}
                >
                  Delete
                </Button>
              </Tooltip>
            )}
            <Button type="submit" loading={form.submitting} disabled={!form.isValid()}>
              {isEditing ? "Update" : "Save"}
            </Button>
          </ModalFooter>
        </Stack>
      </form>
      {deletion.confirming && editingCategory && (
        <DynamicDeleteCategoryModal
          onClose={deletion.cancel}
          category={editingCategory}
          month={month}
          onDelete={deletion.handleDelete}
        />
      )}
    </Modal>
  );
}
