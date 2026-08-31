"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a CSS media query currently matches.
 *
 * `useSyncExternalStore` rather than an effect: the server has no viewport, so
 * it is told to answer `false` and the browser re-reads the real value during
 * hydration. That keeps the first paint identical on both sides — an effect
 * would flip the answer a frame later and tear whatever it is driving.
 *
 * Use it only for what genuinely cannot be expressed in CSS, such as changing
 * the contents of a list rather than its appearance. Anything that is purely
 * visual belongs in a Tailwind breakpoint.
 */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
