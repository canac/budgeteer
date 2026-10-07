import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { loadRules } from "~/lib/ruleLookup";

export const getImportRules = createServerFn()
  .middleware([requireAuth])
  .handler(async () => {
    const rules = await loadRules();
    return Array.from(rules.values()).sort((a, b) =>
      a.externalVendor.localeCompare(b.externalVendor),
    );
  });
