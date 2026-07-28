'use client';

import { useEffect, useState } from 'react';

/**
 * Delay propagating a fast-changing value. Used to keep every keystroke in the
 * student search from becoming its own request.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
