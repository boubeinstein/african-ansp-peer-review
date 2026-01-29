"use client";

import { useRef, useCallback } from "react";

/**
 * Hook to throttle function calls
 *
 * Useful for rate-limiting expensive operations like cursor position updates
 * or API calls that shouldn't fire on every event.
 *
 * @param callback - The function to throttle
 * @param delay - Minimum time between calls in milliseconds
 * @returns Throttled version of the callback
 *
 * @example
 * ```tsx
 * const throttledUpdate = useThrottle((x: number, y: number) => {
 *   api.updateCursor({ x, y });
 * }, 50);
 *
 * // In event handler:
 * onMouseMove={(e) => throttledUpdate(e.clientX, e.clientY)}
 * ```
 */
export function useThrottle<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  const lastCall = useRef(0);
  const lastArgs = useRef<Args | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Args) => {
      const now = Date.now();
      lastArgs.current = args;

      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        callback(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastCall.current = Date.now();
          if (lastArgs.current) {
            callback(...lastArgs.current);
          }
          timeoutRef.current = null;
        }, delay - (now - lastCall.current));
      }
    },
    [callback, delay]
  );
}

/**
 * Hook to debounce function calls
 *
 * Useful for delaying execution until activity stops, like search input
 * or form validation that should wait for user to stop typing.
 *
 * @param callback - The function to debounce
 * @param delay - Time to wait after last call in milliseconds
 * @returns Debounced version of the callback
 *
 * @example
 * ```tsx
 * const debouncedSearch = useDebounce((query: string) => {
 *   api.search(query);
 * }, 300);
 *
 * // In event handler:
 * onChange={(e) => debouncedSearch(e.target.value)}
 * ```
 */
export function useDebounce<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
        timeoutRef.current = null;
      }, delay);
    },
    [callback, delay]
  );
}
