import { Select } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { format } from "date-fns";
import { monthToString } from "~/lib/monthToString";
import "./BudgetMonthSelector.css";

interface BudgetMonthSelectorProps {
  budgetMonths: Date[];
  currentMonth: Date;
}

export function BudgetMonthSelector({ budgetMonths, currentMonth }: BudgetMonthSelectorProps) {
  const router = useRouter();

  const options = budgetMonths.map((month) => ({
    value: monthToString(month),
    label: format(month, "MMMM yyyy"),
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
      value={monthToString(currentMonth)}
      onChange={handleChange}
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
