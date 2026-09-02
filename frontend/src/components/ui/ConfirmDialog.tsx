import { useRef, type ReactNode } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { FormError } from "./Field";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /** The caller closes the dialog after the action succeeds. */
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for destructive actions (delete, deactivate). */
  tone?: "danger" | "primary";
  loading?: boolean;
  /** Server error to show inside the dialog. */
  error?: ReactNode;
}

/** Yes/no dialog. Focus lands on Cancel first so a stray Enter never confirms a destructive action. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  loading = false,
  error,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={title}
      description={description}
      size="sm"
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => void onConfirm()}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {(children || error) && (
        <div className="space-y-3 text-sm text-muted">
          {children}
          <FormError message={error} />
        </div>
      )}
    </Dialog>
  );
}
