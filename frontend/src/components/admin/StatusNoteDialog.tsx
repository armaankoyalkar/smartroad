import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Input";

export interface StatusNoteDialogProps {
  open: boolean;
  onClose: () => void;
  /** The caller closes the dialog once the change has been applied. */
  onConfirm: (note: string) => void | Promise<void>;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  /** A non-empty note is required (rejections, docs/api.md 6.8). */
  requireNote?: boolean;
  noteLabel?: string;
  loading?: boolean;
  /** Server error shown inside the dialog. */
  error?: ReactNode;
}

const NOTE_REQUIRED_MESSAGE = "A reason is required when rejecting";

/** Confirmation dialog with a note textarea, used for rejections and other status changes. */
export function StatusNoteDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "primary",
  requireNote = false,
  noteLabel = "Note",
  loading = false,
  error,
}: StatusNoteDialogProps) {
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const close = () => {
    if (loading) return;
    setNote("");
    setNoteError(null);
    onClose();
  };

  const submit = () => {
    const trimmed = note.trim();
    if (requireNote && !trimmed) {
      setNoteError(NOTE_REQUIRED_MESSAGE);
      textareaRef.current?.focus();
      return;
    }
    if (trimmed.length > 1000) {
      setNoteError("Note must be at most 1000 characters");
      return;
    }
    setNoteError(null);
    void Promise.resolve(onConfirm(trimmed)).then(() => setNote(""));
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={title}
      description={description}
      size="md"
      initialFocusRef={textareaRef}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={submit} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field
          label={noteLabel}
          required={requireNote}
          showOptional={!requireNote}
          error={noteError}
          hint={requireNote ? "The reporter can read this note." : "Optional; the reporter can read it."}
        >
          <Textarea
            ref={textareaRef}
            value={note}
            rows={4}
            maxLength={1000}
            onChange={(event) => {
              setNote(event.target.value);
              if (noteError) setNoteError(null);
            }}
            disabled={loading}
          />
        </Field>
        <FormError message={error} />
      </form>
    </Dialog>
  );
}
