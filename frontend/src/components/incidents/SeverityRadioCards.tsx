import type { ReactNode } from "react";
import { Fieldset } from "@/components/ui/Field";
import { SEVERITY_COLORS } from "@/constants/colors";
import { SEVERITIES, SEVERITY_DESCRIPTIONS, type Severity } from "@/constants/enums";
import { useMeta } from "@/meta/useMeta";
import { cn } from "@/utils/cn";

export interface SeverityRadioCardsProps {
  value: Severity | "";
  onChange: (value: Severity) => void;
  onBlur?: () => void;
  name?: string;
  error?: ReactNode;
  disabled?: boolean;
  legend?: ReactNode;
}

/**
 * The reporter's severity choice as three radio cards, each with a one-line meaning.
 * Native radio inputs keep keyboard and screen-reader behaviour; colour is never the only cue.
 */
export function SeverityRadioCards({
  value,
  onChange,
  onBlur,
  name = "severity",
  error,
  disabled = false,
  legend = "How serious is it?",
}: SeverityRadioCardsProps) {
  const meta = useMeta();
  return (
    <Fieldset
      legend={legend}
      description="Severity is your view of the situation; an administrator sets the priority later."
      error={error}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {SEVERITIES.map((severity) => {
          const selected = value === severity;
          const color = SEVERITY_COLORS[severity];
          return (
            <label
              key={severity}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors duration-150",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cyan-400",
                selected
                  ? "border-cyan-400/60 bg-cyan-400/10"
                  : "border-navy-600 bg-navy-900/40 hover:border-navy-500",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name={name}
                value={severity}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(severity)}
                onBlur={onBlur}
                className="mt-1 h-4 w-4 shrink-0 accent-cyan-400 focus-visible:outline-none"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium text-text">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {meta.label("severity", severity)}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{SEVERITY_DESCRIPTIONS[severity]}</span>
              </span>
            </label>
          );
        })}
      </div>
    </Fieldset>
  );
}
