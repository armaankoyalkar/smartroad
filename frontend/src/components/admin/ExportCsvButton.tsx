import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/useToast";
import { downloadCsv, slugify, toCsv, type CsvCell } from "@/features/admin/csv";

export interface ExportCsvButtonProps {
  /** Base name of the file (slugified, `.csv` appended). */
  filename: string;
  headers: readonly string[];
  rows: readonly (readonly CsvCell[])[];
  disabled?: boolean;
  label?: string;
  size?: "xs" | "sm" | "md";
}

/** Download the displayed table as CSV, generated in the browser from the numbers on screen. */
export function ExportCsvButton({
  filename,
  headers,
  rows,
  disabled = false,
  label = "Export CSV",
  size = "xs",
}: ExportCsvButtonProps) {
  const toast = useToast();
  return (
    <Button
      size={size}
      variant="outline"
      disabled={disabled || rows.length === 0}
      onClick={() => {
        const name = `${slugify(filename)}.csv`;
        downloadCsv(name, toCsv(headers, rows));
        toast.info("CSV downloaded", { description: name });
      }}
      leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
    >
      {label}
    </Button>
  );
}
