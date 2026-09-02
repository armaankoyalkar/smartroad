import { cn } from "@/utils/cn";
import { passwordStrength } from "./authErrors";

const TONES = ["bg-danger", "bg-warning", "bg-cyan-400", "bg-success"] as const;

/** Length-based strength meter; the text always carries the meaning, the bar only illustrates it. */
export function PasswordStrengthHint({ password, id }: { password: string; id?: string }) {
  const strength = passwordStrength(password);
  return (
    <div id={id} className="space-y-1" aria-live="polite">
      <div className="flex items-center gap-1" aria-hidden="true">
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={cn(
              "h-1 flex-1 rounded-full bg-navy-600 transition-colors duration-200",
              password.length > 0 && strength.score >= step && TONES[strength.score],
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted">
        {strength.label && <span className="font-medium text-text">{strength.label}. </span>}
        {strength.hint}
      </p>
    </div>
  );
}
