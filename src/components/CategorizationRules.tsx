import { ActionIcon, Badge, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { DynamicCategorizationRuleModal } from "~/components/DynamicCategorizationRuleModal";
import { List, ListRow } from "~/components/List";
import { deleteCategorizationRule as deleteCategorizationRuleFn } from "~/functions/deleteCategorizationRule";

export interface Rule {
  id: string;
  externalVendor: string;
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
      <List>
        {rules.map((rule) => (
          <ListRow
            key={rule.id}
            title={rule.vendor}
            meta={rule.externalVendor}
            tags={
              rule.category ? (
                <Badge variant="light" color="gray" size="lg" tt="none">
                  {rule.category.name}
                </Badge>
              ) : undefined
            }
            actions={
              <Group gap={4} wrap="nowrap">
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  aria-label="Edit"
                  onClick={() => openEdit(rule)}
                >
                  <IconPencil />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  color="red"
                  aria-label="Delete"
                  onClick={() => handleDelete(rule.id)}
                >
                  <IconTrash />
                </ActionIcon>
              </Group>
            }
          />
        ))}
      </List>
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
