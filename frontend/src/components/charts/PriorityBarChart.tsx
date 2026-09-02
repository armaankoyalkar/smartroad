import { BreakdownChart, type BreakdownChartProps } from "./BreakdownChart";

export type PriorityBarChartProps = Omit<BreakdownChartProps, "by" | "kind">;

/** Columns per priority (Unassigned included) using the shared priority colours. */
export function PriorityBarChart(props: PriorityBarChartProps) {
  return <BreakdownChart by="priority" kind="columns" {...props} />;
}
