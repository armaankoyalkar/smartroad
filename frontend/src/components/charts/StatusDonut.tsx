import { BreakdownChart, type BreakdownChartProps } from "./BreakdownChart";

export type StatusDonutProps = Omit<BreakdownChartProps, "by" | "kind">;

/** Ring chart of the status distribution using the shared status colours. */
export function StatusDonut(props: StatusDonutProps) {
  return <BreakdownChart by="status" kind="donut" {...props} />;
}
