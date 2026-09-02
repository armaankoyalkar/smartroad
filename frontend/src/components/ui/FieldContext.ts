import { createContext, useContext } from "react";

export interface FieldContextValue {
  /** Id the control must use so the Field label points at it. */
  id: string;
  /** Ids of the hint and error paragraphs. */
  describedBy?: string;
  invalid: boolean;
  required: boolean;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

export interface ControlAriaProps {
  id?: string;
  invalid?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
}

/**
 * Merge a control's own props with the enclosing <Field>: explicit props win, otherwise
 * the id, aria-describedby and aria-invalid come from the Field.
 */
export function useFieldControl(props: ControlAriaProps) {
  const field = useContext(FieldContext);
  const id = props.id ?? field?.id;
  const ariaInvalid = props["aria-invalid"];
  let invalid: boolean;
  if (props.invalid !== undefined) invalid = props.invalid;
  else if (ariaInvalid !== undefined) invalid = ariaInvalid === true || ariaInvalid === "true";
  else invalid = field?.invalid ?? false;
  const describedBy = [props["aria-describedby"], field?.describedBy].filter(Boolean).join(" ") || undefined;
  return { id, invalid, describedBy, required: field?.required ?? false };
}
