import { Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import type { RuleDraft } from "~/components/RuleModal";
import type { VendorRules } from "~/lib/ruleLookup";
import { DynamicRuleModal, preloadRuleModal } from "~/components/DynamicRuleModal";
import { List, ListRow } from "~/components/List";
import { RuleBadges } from "~/components/RuleBadges";
import { deleteRule as deleteRuleFn } from "~/functions/deleteRule";
import { formatSignedCurrency } from "~/lib/formatters";
import { preloadOnHover } from "~/lib/preloadOnHover";
import classes from "./ImportRules.module.css";

interface ImportRulesProps {
  rules: VendorRules[];
}

export function ImportRules({ rules }: ImportRulesProps) {
  const router = useRouter();
  const deleteRule = useServerFn(deleteRuleFn);
  const [modalOpen, { open, close }] = useDisclosure(false);
  const [draft, setDraft] = useState<RuleDraft | undefined>(undefined);

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

  const preloadModals = preloadOnHover(preloadRuleModal);

  return (
    <>
      <List className={classes.root}>
        {rules.flatMap((rule) => {
          const vendor = rule.vendorAlias ?? rule.externalVendor;
          return [
            <ListRow
              key={rule.externalVendor}
              className={classes.row}
              title={vendor}
              meta={rule.externalVendor}
              actions={
                <Group gap={4} wrap="nowrap">
                  <RuleBadges outcome={rule.vendorRule} />
                </Group>
              }
              {...preloadModals}
              onClick={() => openEdit({ scope: "vendor", rule })}
            />,
            ...rule.amountRules.map((amountRule) => (
              <ListRow
                key={amountRule.id}
                className={classes.row}
                title={
                  <>
                    {vendor}
                    <span className={classes.ruleSeparator}>•</span>
                    <span className={classes.ruleAmount}>
                      {formatSignedCurrency(amountRule.amount)}
                    </span>
                  </>
                }
                meta={rule.externalVendor}
                actions={
                  <Group gap={4} wrap="nowrap">
                    <RuleBadges outcome={amountRule.outcome} />
                  </Group>
                }
                {...preloadModals}
                onClick={() =>
                  openEdit({
                    scope: "amount",
                    externalVendor: rule.externalVendor,
                    vendor,
                    rule: amountRule,
                  })
                }
              />
            )),
          ];
        })}
      </List>
      {modalOpen && draft && (
        <DynamicRuleModal
          onClose={close}
          onSave={handleSave}
          onDelete={() =>
            handleDelete(
              draft.scope === "vendor"
                ? { scope: "vendor", externalVendor: draft.rule.externalVendor }
                : { scope: "amount", id: draft.rule.id },
            )
          }
          draft={draft}
        />
      )}
    </>
  );
}
