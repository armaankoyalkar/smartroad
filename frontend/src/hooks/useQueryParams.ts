import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

export type QueryParamValue = string | number | boolean | readonly string[] | null | undefined;

export interface SetParamsOptions {
  /** Replace the history entry instead of pushing (default true: filters should not spam history). */
  replace?: boolean;
  /** Remove `page` when other filters change (default true). */
  resetPage?: boolean;
}

/**
 * Filters live in the URL so a filtered list or map can be shared and survives reloads.
 * Multi-valued filters are comma-separated, matching the API convention.
 */
export function useQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const get = useCallback(
    (key: string): string | undefined => {
      const value = searchParams.get(key);
      return value === null || value === "" ? undefined : value;
    },
    [searchParams],
  );

  const getList = useCallback(
    (key: string): string[] =>
      (searchParams.get(key) ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    [searchParams],
  );

  /** Only values that appear in `allowed` survive, so a bad URL cannot produce a bad request. */
  const getEnumList = useCallback(
    <T extends string>(key: string, allowed: readonly T[]): T[] =>
      getList(key).filter((v): v is T => (allowed as readonly string[]).includes(v)),
    [getList],
  );

  const getEnum = useCallback(
    <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
      const value = get(key);
      return value !== undefined && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
    },
    [get],
  );

  const getNumber = useCallback(
    (key: string, fallback: number): number => {
      const value = Number(get(key));
      return Number.isFinite(value) ? value : fallback;
    },
    [get],
  );

  const getBoolean = useCallback(
    (key: string, fallback = false): boolean => {
      const value = get(key);
      if (value === undefined) return fallback;
      return value === "true" || value === "1";
    },
    [get],
  );

  const setMany = useCallback(
    (updates: Record<string, QueryParamValue>, options: SetParamsOptions = {}) => {
      const { replace = true, resetPage = true } = options;
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(updates)) {
            const serialised = Array.isArray(value) ? value.join(",") : value;
            if (
              serialised === undefined ||
              serialised === null ||
              serialised === "" ||
              serialised === false
            ) {
              next.delete(key);
            } else {
              next.set(key, String(serialised));
            }
          }
          if (resetPage && !("page" in updates)) next.delete("page");
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  const setOne = useCallback(
    (key: string, value: QueryParamValue, options?: SetParamsOptions) => setMany({ [key]: value }, options),
    [setMany],
  );

  const clear = useCallback(
    (keys?: readonly string[], options: SetParamsOptions = {}) => {
      setSearchParams(
        (previous) => {
          if (!keys) return new URLSearchParams();
          const next = new URLSearchParams(previous);
          for (const key of keys) next.delete(key);
          return next;
        },
        { replace: options.replace ?? true },
      );
    },
    [setSearchParams],
  );

  return useMemo(
    () => ({
      searchParams,
      get,
      getList,
      getEnumList,
      getEnum,
      getNumber,
      getBoolean,
      setMany,
      setOne,
      clear,
      /** Current query as a plain object (single values only). */
      toObject: () => Object.fromEntries(searchParams.entries()),
      isEmpty: [...searchParams.keys()].length === 0,
    }),
    [searchParams, get, getList, getEnumList, getEnum, getNumber, getBoolean, setMany, setOne, clear],
  );
}

export type QueryParamsApi = ReturnType<typeof useQueryParams>;
