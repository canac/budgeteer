import { Select } from "@mantine/core";
import type { ExternalAccount } from "~/prisma/client";

interface ExternalAccountSelectProps {
  accounts: Pick<ExternalAccount, "id" | "name" | "institution">[];
  value: string | null;
  onChange: (accountId: string | null) => void;
}

export function ExternalAccountSelect({ accounts, value, onChange }: ExternalAccountSelectProps) {
  return (
    <Select
      label="Account"
      placeholder="Any account"
      miw={{ md: "24rem" }}
      clearable
      searchable
      value={value}
      data={accounts.map((account) => ({
        value: account.id,
        label: `${account.institution} · ${account.name}`,
      }))}
      onChange={onChange}
    />
  );
}
