import { ScrollArea } from "@mantine/core";
import { parseISO } from "date-fns";
import { monthFormatter } from "~/lib/formatters";
import { MantineNavLink } from "./MantineNavLink";

interface BudgetMonthSelectorProps {
  budgetMonths: string[];
  currentMonth: string | null;
  onNavigate?: () => void;
}

export function BudgetMonthSelector({
  budgetMonths,
  currentMonth,
  onNavigate,
}: BudgetMonthSelectorProps) {
  return (
    <ScrollArea.Autosize mah={220} type="scroll">
      {budgetMonths.map((month) => (
        <MantineNavLink
          key={month}
          to="/budget/$month"
          params={{ month }}
          label={monthFormatter.format(parseISO(month))}
          active={month === currentMonth}
          onClick={onNavigate}
        />
      ))}
    </ScrollArea.Autosize>
  );
}
