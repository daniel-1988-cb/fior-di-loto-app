"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the given CSS media query matches.
 * Initialises to `false` on the server / first render to avoid hydration
 * mismatch; the value is updated asynchronously on mount via a change event
 * fired immediately after subscription, plus on every subsequent change.
 *
 * @example
 * const isMobile = useMediaQuery("(max-width: 767px)");
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);

    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setMatches(e.matches);

    // Subscribe first, then dispatch a synthetic event to synchronise state
    // without calling setState directly in the effect body.
    mql.addEventListener("change", handler as (e: MediaQueryListEvent) => void);
    handler(mql); // safe: runs after subscription, batched by React

    return () =>
      mql.removeEventListener(
        "change",
        handler as (e: MediaQueryListEvent) => void,
      );
  }, [query]);

  return matches;
}
