import { ActionIcon, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import type { RuleDraft } from "~/components/RuleModal";
import type { AmountRule, VendorRules } from "~/lib/ruleLookup";
import { DynamicDeleteRuleModal } from "~/components/DynamicDeleteRuleModal";
import { DynamicRuleModal } from "~/components/DynamicRuleModal";
import { List, ListRow } from "~/components/List";
import { RuleBadges } from "~/components/RuleBadges";
import { deleteRule as deleteRuleFn } from "~/functions/deleteRule";
import { formatSignedCurrency } from "~/lib/formatters";
import "./ImportRules.css";

interface ImportRulesProps {
  rules: VendorRules[];
}

type DeleteDraft =
  | { scope: "vendor"; rule: VendorRules }
  | { scope: "amount"; vendorRules: VendorRules; rule: AmountRule };

export function ImportRules({ rules }: ImportRulesProps) {
  const router = useRouter();
  const deleteRule = useServerFn(deleteRuleFn);
  const [modalOpen, { open, close }] = useDisclosure(false);
  const [draft, setDraft] = useState<RuleDraft | undefined>(undefined);
  const [deleting, setDeleting] = useState<DeleteDraft | undefined>(undefined);

  const handleSave = async () => {
    await router.invalidate();
  };

  const handleDelete = async (data: Parameters<typeof deleteRuleFn>[0]["data"]) => {
    await deleteRule({ data });
    await router.invalidate();
  };

  const openEdit = (next: RuleDraft) => {
    setDraft(next);
    open();
  };

  return (
    <>
      <List className="ImportRules">
        {rules.flatMap((rule) => [
          <ListRow
            key={rule.externalVendor}
            title={rule.vendorAlias ?? rule.externalVendor}
            meta={rule.externalVendor}
            actions={
              <Group gap={4} wrap="nowrap">
                <RuleBadges outcome={rule.vendorRule} />
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  aria-label="Edit"
                  onClick={() => openEdit({ scope: "vendor", rule })}
                >
                  <IconPencil />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  color="red"
                  aria-label="Delete"
                  onClick={() => setDeleting({ scope: "vendor", rule })}
                >
                  <IconTrash />
                </ActionIcon>
              </Group>
            }
          />,
          ...rule.amountRules.map((amountRule) => (
            <ListRow
              key={amountRule.id}
              title={
                <>
                  {rule.vendorAlias ?? rule.externalVendor}
                  <span className="rule-separator">•</span>
                  <span className="rule-amount">{formatSignedCurrency(amountRule.amount)}</span>
                </>
              }
              meta={rule.externalVendor}
              actions={
                <Group gap={4} wrap="nowrap">
                  <RuleBadges outcome={amountRule.outcome} />
                  <ActionIcon
                    variant="subtle"
                    size="lg"
                    aria-label="Edit"
                    onClick={() =>
                      openEdit({
                        scope: "amount",
                        externalVendor: rule.externalVendor,
                        rule: amountRule,
                      })
                    }
                  >
                    <IconPencil />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    size="lg"
                    color="red"
                    aria-label="Delete"
                    onClick={() =>
                      setDeleting({ scope: "amount", vendorRules: rule, rule: amountRule })
                    }
                  >
                    <IconTrash />
                  </ActionIcon>
                </Group>
              }
            />
          )),
        ])}
      </List>
      {modalOpen && draft && <DynamicRuleModal onClose={close} onSave={handleSave} draft={draft} />}
      {deleting?.scope === "vendor" && (
        <DynamicDeleteRuleModal
          onClose={() => setDeleting(undefined)}
          onDelete={() =>
            handleDelete({ scope: "vendor", externalVendor: deleting.rule.externalVendor })
          }
          vendor={deleting.rule.vendorAlias ?? deleting.rule.externalVendor}
          amountRuleCount={deleting.rule.amountRules.length}
        />
      )}
      {deleting?.scope === "amount" && (
        <DynamicDeleteRuleModal
          onClose={() => setDeleting(undefined)}
          onDelete={() => handleDelete({ scope: "amount", id: deleting.rule.id })}
          vendor={deleting.vendorRules.vendorAlias ?? deleting.vendorRules.externalVendor}
          amount={deleting.rule.amount}
          amountRuleCount={0}
        />
      )}
    </>
  );
}
