import { useCallback, useEffect, useRef, useState } from "react";

/** Returns `value` after it has stopped changing for `delay` ms. */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** A stable callback that runs `fn` only after `delay` ms without further calls. */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay = 300) {
  const fnRef = useRef(fn);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return useCallback(
    (...args: A) => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => fnRef.current(...args), delay);
    },
    [delay],
  );
}
