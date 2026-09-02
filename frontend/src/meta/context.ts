/**
 * The meta context object and its types (a plain .ts module so MetaContext.tsx exports
 * only the provider component). Read it with useMeta() from "@/meta/useMeta".
 */
import { createContext } from "react";
import type { Category, EnumLabels, Enums } from "@/types/api";

export interface CategoryInfo extends Category {
  /** false when the key is not in the list served by the API (or the list is a fallback). */
  known: boolean;
}

export type LabelKind = keyof EnumLabels;

export interface MetaContextValue {
  categories: Category[];
  enums: Enums;
  /** "api" once both endpoints answered, "fallback" while loading or after a failure. */
  source: "api" | "fallback";
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  getCategory: (key: string) => CategoryInfo;
  categoryColor: (key: string) => string;
  categoryLabel: (key: string) => string;
  /** Display label for any enum value, preferring the API labels. */
  label: (kind: LabelKind, key: string | null | undefined) => string;
}

export const MetaContext = createContext<MetaContextValue | null>(null);
