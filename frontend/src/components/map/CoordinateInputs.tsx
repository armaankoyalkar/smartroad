import type { KeyboardEvent, ReactNode } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

export interface CoordinateInputsProps {
  latitudeText: string;
  longitudeText: string;
  onLatitudeChange: (text: string) => void;
  onLongitudeChange: (text: string) => void;
  /** Called on blur or Enter; the picker parses and validates the pair. */
  onCommit: () => void;
  disabled?: boolean;
  error?: ReactNode;
  idPrefix?: string;
}

/** Keyboard-accessible latitude / longitude inputs kept in sync with the map marker. */
export function CoordinateInputs({
  latitudeText,
  longitudeText,
  onLatitudeChange,
  onLongitudeChange,
  onCommit,
  disabled = false,
  error,
  idPrefix = "location",
}: CoordinateInputsProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommit();
    }
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field id={`${idPrefix}-latitude`} label="Latitude" hint="-90 to 90" error={error}>
        <Input
          type="number"
          inputMode="decimal"
          step="any"
          min={-90}
          max={90}
          placeholder="17.38500"
          value={latitudeText}
          disabled={disabled}
          onChange={(e) => onLatitudeChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={onKeyDown}
        />
      </Field>
      <Field id={`${idPrefix}-longitude`} label="Longitude" hint="-180 to 180" error={error}>
        <Input
          type="number"
          inputMode="decimal"
          step="any"
          min={-180}
          max={180}
          placeholder="78.48670"
          value={longitudeText}
          disabled={disabled}
          onChange={(e) => onLongitudeChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={onKeyDown}
        />
      </Field>
    </div>
  );
}
