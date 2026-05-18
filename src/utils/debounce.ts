import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a stable, leading-edge debounced wrapper around `fn`.
 *
 * - The first call fires immediately.
 * - Any subsequent calls within `ms` milliseconds are silently dropped.
 * - The latest version of `fn` is always invoked (safe to use with closures
 *   over component state without adding `fn` to the dependency array).
 *
 * Intended for E Ink touchscreens where a single physical press can generate
 * multiple touch events in quick succession.
 */
export function useDebounce<Args extends unknown[]>(
  fn: (...args: Args) => unknown,
  ms = 500,
): (...args: Args) => void {
  // Always holds the latest fn so the debounced wrapper never goes stale.
  const fnRef    = useRef(fn);
  const lastCall = useRef(0);

  useEffect(() => { fnRef.current = fn; });

  return useCallback((...args: Args) => {
    const now = Date.now();
    if (now - lastCall.current < ms) return;
    lastCall.current = now;
    fnRef.current(...args);
  }, [ms]);
}
