/**
 * Badges for the domain vocabulary. Colours come from constants/colors.ts, labels from
 * MetaContext (API labels with local fallbacks); category colours come from the API only.
 */
import {
  NEUTRAL_COLOR,
  PRIORITY_COLORS,
  RISK_COLORS,
  SEVERITY_COLORS,
  SOURCE_COLORS,
  STATUS_COLORS,
  VERIFICATION_COLORS,
} from "@/constants/colors";
import { PRIORITY_UNASSIGNED_LABEL, RISK_NONE_LABEL } from "@/constants/enums";
import { useMeta } from "@/meta/useMeta";
import { Badge, type BadgeProps } from "./Badge";

type Common = Pick<BadgeProps, "size" | "variant" | "className" | "dot">;

const colorOf = (map: Record<string, string>, key: string | null | undefined) =>
  (key && map[key]) || NEUTRAL_COLOR;

export function StatusBadge({ status, ...rest }: Common & { status: string }) {
  const meta = useMeta();
  return (
    <Badge color={colorOf(STATUS_COLORS, status)} {...rest}>
      {meta.label("status", status)}
    </Badge>
  );
}

export function SeverityBadge({ severity, ...rest }: Common & { severity: string }) {
  const meta = useMeta();
  return (
    <Badge color={colorOf(SEVERITY_COLORS, severity)} {...rest}>
      {meta.label("severity", severity)}
    </Badge>
  );
}

/** `null` renders "Unassigned" in a neutral colour. */
export function PriorityBadge({ priority, ...rest }: Common & { priority: string | null | undefined }) {
  const meta = useMeta();
  return (
    <Badge color={colorOf(PRIORITY_COLORS, priority)} {...rest}>
      {priority ? meta.label("priority", priority) : PRIORITY_UNASSIGNED_LABEL}
    </Badge>
  );
}

/** `null` renders "No estimate". Pass `demo` to append "(demo model)" for honesty. */
export function RiskBadge({
  level,
  demo = false,
  ...rest
}: Common & { level: string | null | undefined; demo?: boolean }) {
  const meta = useMeta();
  return (
    <Badge color={colorOf(RISK_COLORS, level)} {...rest}>
      {level ? meta.label("riskLevel", level) : RISK_NONE_LABEL}
      {level && demo ? " (demo model)" : null}
    </Badge>
  );
}

export function VerificationBadge({ verification, ...rest }: Common & { verification: string }) {
  const meta = useMeta();
  return (
    <Badge color={colorOf(VERIFICATION_COLORS, verification)} {...rest}>
      {meta.label("verification", verification)}
    </Badge>
  );
}

/** Colour and label from GET /api/meta/categories (neutral fallback before it answers). */
export function CategoryBadge({ category, ...rest }: Common & { category: string }) {
  const meta = useMeta();
  const info = meta.getCategory(category);
  return (
    <Badge color={info.color} {...rest}>
      {info.label}
    </Badge>
  );
}

/** "Demo data" for seed records; "Reported by a user" otherwise. */
export function SourceBadge({ source, ...rest }: Common & { source: string }) {
  const meta = useMeta();
  return (
    <Badge color={colorOf(SOURCE_COLORS, source)} variant="outline" {...rest}>
      {meta.label("source", source)}
    </Badge>
  );
}
