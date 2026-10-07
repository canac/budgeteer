import { prisma } from "~/lib/prisma";

export interface RuleCategory {
  id: string;
  name: string;
}

export interface StoredSplit {
  category: RuleCategory;
  amount: number;
}

/** What a rule does to the transactions it matches */
export type RuleOutcome<Split = StoredSplit> =
  | { type: "dismiss" }
  | { type: "categorize"; splits: Split[] };

export interface AmountRule {
  id: string;
  amount: number;
  outcome: RuleOutcome;
}

/** All rules associated with a vendor */
export interface VendorRules {
  externalVendor: string;
  vendorAlias: string | null;
  vendorRule: RuleOutcome<{ category: RuleCategory }> | null;
  amountRules: AmountRule[];
}

const categorySelect = { select: { id: true, name: true } } as const;

function toOutcome<Split>(splits: Split[]): RuleOutcome<Split> {
  // No splits dismisses
  return splits.length > 0 ? { type: "categorize", splits } : { type: "dismiss" };
}

/** Stored rules keyed by bank vendor, for `externalVendors` or for every vendor when omitted */
export async function loadRules(externalVendors?: string[]): Promise<Map<string, VendorRules>> {
  const where = externalVendors && { externalVendor: { in: externalVendors } };
  const [aliases, vendorRules, amountRules] = await Promise.all([
    prisma.vendorAlias.findMany({ where }),
    prisma.vendorRule.findMany({ where, include: { category: categorySelect } }),
    prisma.amountRule.findMany({
      where,
      orderBy: { amount: "asc" },
      select: {
        id: true,
        externalVendor: true,
        amount: true,
        splits: {
          orderBy: { category: { name: "asc" } },
          select: { amount: true, category: categorySelect },
        },
      },
    }),
  ]);

  const rules = new Map<string, VendorRules>();
  const getVendor = (externalVendor: string) => {
    let vendor = rules.get(externalVendor);
    if (!vendor) {
      vendor = { externalVendor, vendorAlias: null, vendorRule: null, amountRules: [] };
      rules.set(externalVendor, vendor);
    }
    return vendor;
  };

  for (const { externalVendor, vendor } of aliases) {
    getVendor(externalVendor).vendorAlias = vendor;
  }
  for (const { externalVendor, category } of vendorRules) {
    getVendor(externalVendor).vendorRule = toOutcome(category ? [{ category }] : []);
  }
  for (const { id, externalVendor, amount, splits } of amountRules) {
    getVendor(externalVendor).amountRules.push({ id, amount, outcome: toOutcome(splits) });
  }
  return rules;
}
