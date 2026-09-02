/**
 * Categories and enums fetched once from GET /api/meta/*. While loading, or when the API
 * is unreachable, the app still renders with local fallbacks: labels from constants/enums.ts
 * and a single neutral colour for categories (category colours are never hard-coded).
 *
 * Read the value with useMeta() from "@/meta/useMeta".
 */
import { useCallback, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCategories, getEnums } from "@/api/meta";
import { queryKeys } from "@/api/queryKeys";
import { FALLBACK_CATEGORIES, FALLBACK_ENUMS } from "./fallbacks";
import { MetaContext } from "./context";
import { createMetaValue } from "./metaValue";

export type { CategoryInfo, LabelKind, MetaContextValue } from "./context";

export function MetaProvider({ children }: { children: ReactNode }) {
  const categoriesQuery = useQuery({
    queryKey: queryKeys.meta.categories,
    queryFn: getCategories,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const enumsQuery = useQuery({
    queryKey: queryKeys.meta.enums,
    queryFn: getEnums,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const refetchCategories = categoriesQuery.refetch;
  const refetchEnums = enumsQuery.refetch;
  const refetch = useCallback(() => {
    void refetchCategories();
    void refetchEnums();
  }, [refetchCategories, refetchEnums]);

  const categories = categoriesQuery.data;
  const enums = enumsQuery.data;
  const isLoading = categoriesQuery.isPending || enumsQuery.isPending;
  const isError = categoriesQuery.isError || enumsQuery.isError;
  const error = categoriesQuery.error ?? enumsQuery.error ?? null;

  const value = useMemo(
    () =>
      createMetaValue({
        categories: categories ?? FALLBACK_CATEGORIES,
        enums: enums ?? FALLBACK_ENUMS,
        categoriesFromApi: !!categories,
        enumsFromApi: !!enums,
        isLoading,
        isError,
        error,
        refetch,
      }),
    [categories, enums, isLoading, isError, error, refetch],
  );

  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>;
}
