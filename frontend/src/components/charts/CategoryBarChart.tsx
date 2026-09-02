import { BreakdownChart, type BreakdownChartProps } from "./BreakdownChart";

export type CategoryBarChartProps = Omit<BreakdownChartProps, "by" | "kind">;

/** Horizontal bars, one per category, coloured with the API category colours. */
export function CategoryBarChart(props: CategoryBarChartProps) {
  return <BreakdownChart by="category" kind="bars" {...props} />;
}
