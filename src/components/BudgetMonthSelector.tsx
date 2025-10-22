import { Select } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { parseISO } from "date-fns";
import { monthFormatter } from "~/lib/formatters";
import "./BudgetMonthSelector.css";

interface BudgetMonthSelectorProps {
  budgetMonths: string[];
  currentMonth: string | null;
}

export function BudgetMonthSelector({ budgetMonths, currentMonth }: BudgetMonthSelectorProps) {
  const router = useRouter();

  const options = budgetMonths.map((month) => ({
    value: month,
    label: monthFormatter.format(parseISO(month)),
  }));

  const handleChange = (value: string | null) => {
    if (value) {
      router.navigate({ to: "/budget/$month", params: { month: value } });
    }
  };

  return (
    <Select
      className="BudgetMonthSelector"
      data={options}
      value={currentMonth}
      onChange={handleChange}
      placeholder="Select Month"
      variant="subtle"
      color="white"
      size="lg"
      classNames={{
        section: "section",
        input: "input",
      }}
    />
  );
}
