import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { loadRules } from "~/lib/ruleLookup";

export const getImportRules = createServerFn()
  .middleware([requireAuth])
  .handler(async () => {
    const rules = await loadRules();
    return rules
      .values()
      .toArray()
      .toSorted((rule1, rule2) => rule1.externalVendor.localeCompare(rule2.externalVendor));
  });
