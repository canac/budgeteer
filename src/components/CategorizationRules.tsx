import { ActionIcon, Group, Table } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { DynamicCategorizationRuleModal } from "~/components/DynamicCategorizationRuleModal";
import { deleteCategorizationRule as deleteCategorizationRuleFn } from "~/functions/deleteCategorizationRule";

interface Rule {
  id: string;
  tellerVendor: string;
  vendor: string;
  categoryId: string | null;
  category: { name: string } | null;
}

interface CategorizationRulesProps {
  rules: Rule[];
}

export function CategorizationRules({ rules }: CategorizationRulesProps) {
  const router = useRouter();
  const deleteCategorizationRule = useServerFn(deleteCategorizationRuleFn);
  const [modalOpen, { open, close }] = useDisclosure(false);
  const [editingRule, setEditingRule] = useState<Rule | undefined>(undefined);

  const handleSave = async () => {
    await router.invalidate();
  };

  const handleDelete = async (id: string) => {
    await deleteCategorizationRule({ data: { id } });
    await router.invalidate();
  };

  const openEdit = (rule: Rule) => {
    setEditingRule(rule);
    open();
  };

  return (
    <>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Teller Vendor</Table.Th>
            <Table.Th>Vendor</Table.Th>
            <Table.Th>Category</Table.Th>
            <Table.Th ta="center">Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rules.map((rule) => (
            <Table.Tr key={rule.id}>
              <Table.Td>{rule.tellerVendor}</Table.Td>
              <Table.Td>{rule.vendor}</Table.Td>
              <Table.Td>{rule.category?.name}</Table.Td>
              <Table.Td>
                <Group gap="xs" justify="center">
                  <ActionIcon variant="subtle" aria-label="Edit" onClick={() => openEdit(rule)}>
                    <IconPencil />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label="Delete"
                    onClick={() => handleDelete(rule.id)}
                  >
                    <IconTrash />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {modalOpen && editingRule && (
        <DynamicCategorizationRuleModal
          onClose={close}
          onSave={handleSave}
          editingRule={editingRule}
        />
      )}
    </>
  );
}
