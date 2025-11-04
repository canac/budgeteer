import { CompositeChart, type CompositeChartSeries } from "@mantine/charts";
import { parseISO } from "date-fns";
import { formatCurrency, monthFormatter } from "~/lib/formatters";

interface MonthlyData {
  month: string;
  budgeted: number;
  spent: number;
}

interface CategoryHistoryChartProps {
  monthlyData: MonthlyData[];
}

export function CategoryHistoryChart({ monthlyData }: CategoryHistoryChartProps) {
  const data = monthlyData.map(({ month, spent, budgeted }) => ({
    month: monthFormatter.format(parseISO(month)),
    spent,
    budgeted,
  }));

  const series: CompositeChartSeries[] = [
    {
      name: "budgeted",
      label: "Budgeted",
      color: "blue.6",
      type: "line",
    },
    {
      name: "spent",
      label: "Spent",
      color: "green.6",
      type: "bar",
    },
  ];

  return (
    <CompositeChart
      h={300}
      data={data}
      dataKey="month"
      series={series}
      maxBarWidth={50}
      curveType="linear"
      valueFormatter={formatCurrency}
      tickLine="y"
      gridAxis="x"
      yAxisProps={{ width: 80 }}
    />
  );
}
