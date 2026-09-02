/**
 * Pure builder for the MetaContext value. The provider calls it with query results;
 * tests call it with fixed data (see src/test/utils.tsx).
 */
import { FALLBACK_CATEGORY_COLOR } from "@/constants/colors";
import { CATEGORY_LABELS } from "@/constants/enums";
import type { Category, Enums } from "@/types/api";
import { LOCAL_LABELS } from "./fallbacks";
import type { CategoryInfo, LabelKind, MetaContextValue } from "./context";

export interface MetaValueInput {
  categories: Category[];
  enums: Enums;
  /** true when `categories` came from the API (then unknown keys are really unknown). */
  categoriesFromApi: boolean;
  /** true when `enums` came from the API. */
  enumsFromApi: boolean;
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  refetch?: () => void;
}

export function createMetaValue(input: MetaValueInput): MetaContextValue {
  const { categories, enums, categoriesFromApi, enumsFromApi } = input;
  const byKey = new Map<string, Category>(categories.map((c) => [c.key as string, c]));

  const getCategory = (key: string): CategoryInfo => {
    const found = byKey.get(key);
    if (found) return { ...found, known: categoriesFromApi };
    const label = (CATEGORY_LABELS as Record<string, string>)[key] ?? key;
    return {
      key: key as Category["key"],
      label,
      color: FALLBACK_CATEGORY_COLOR,
      description: "",
      known: false,
    };
  };

  const label = (kind: LabelKind, key: string | null | undefined): string => {
    if (key === null || key === undefined || key === "") return "";
    const apiLabel = (enums.labels?.[kind] as Record<string, string> | undefined)?.[key];
    const localLabel = (LOCAL_LABELS[kind] as Record<string, string>)[key];
    return apiLabel ?? localLabel ?? key;
  };

  return {
    categories,
    enums,
    source: categoriesFromApi && enumsFromApi ? "api" : "fallback",
    isLoading: input.isLoading ?? false,
    isError: input.isError ?? false,
    error: input.error ?? null,
    refetch: input.refetch ?? (() => undefined),
    getCategory,
    categoryColor: (key) => getCategory(key).color,
    categoryLabel: (key) => getCategory(key).label,
    label,
  };
}
