"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps focus within a container element.
 *
 * When active:
 * - Focuses first focusable element (or initialFocusRef if provided) on mount.
 * - Tab cycles forward, Shift+Tab cycles backward within the container.
 * - Escape calls onEscape (optional).
 * - On unmount, restores focus to the element that was focused before mounting.
 */
export function useFocusTrap(opts: {
  containerRef: RefObject<HTMLElement | null>;
  active: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
}) {
  const { containerRef, active, initialFocusRef, onEscape } = opts;

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    // Save previously focused element to restore on unmount.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus initial element.
    const target = initialFocusRef?.current;
    if (target && container.contains(target)) {
      target.focus();
    } else {
      const first = container.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
      first?.focus();
    }

    function getFocusable(): HTMLElement[] {
      return Array.from(container!.querySelectorAll<HTMLElement>(FOCUSABLE));
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement;

      if (e.shiftKey) {
        // Shift+Tab: go backward
        if (current === first || !container!.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: go forward
        if (current === last || !container!.contains(current)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus on unmount.
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef, initialFocusRef, onEscape]);
}
