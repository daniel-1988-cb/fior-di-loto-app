// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { useFocusTrap } from "../use-focus-trap";

/* ---------- helpers ---------- */

function makeContainer(buttons = 3) {
  const div = document.createElement("div");
  for (let i = 0; i < buttons; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Button ${i}`;
    div.appendChild(btn);
  }
  document.body.appendChild(div);
  return div;
}

function tab(shift = false) {
  const active = document.activeElement as HTMLElement;
  active.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab", shiftKey: shift, bubbles: true })
  );
}

function escape() {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
  );
}

/* ---------- tests ---------- */

describe("useFocusTrap", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("focuses first focusable element on mount", () => {
    const container = makeContainer(3);
    const buttons = container.querySelectorAll("button");

    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap({ containerRef: ref, active: true });
      return ref;
    });

    expect(document.activeElement).toBe(buttons[0]);
    result.current; // suppress unused-var lint
  });

  it("tab cycles forward among focusable elements", () => {
    const container = makeContainer(3);
    const buttons = Array.from(container.querySelectorAll("button"));

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap({ containerRef: ref, active: true });
    });

    // After mount, focus is on buttons[0].
    expect(document.activeElement).toBe(buttons[0]);

    // Simulate Tab on the last button — should wrap to first.
    buttons[2].focus();
    tab(false);
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("Shift+Tab wraps from first to last", () => {
    const container = makeContainer(3);
    const buttons = Array.from(container.querySelectorAll("button"));

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap({ containerRef: ref, active: true });
    });

    // Focus first button then Shift+Tab.
    buttons[0].focus();
    tab(true);
    expect(document.activeElement).toBe(buttons[2]);
  });

  it("calls onEscape and restores focus on unmount", () => {
    const onEscape = vi.fn();

    // Set a pre-existing focused element.
    const outside = document.createElement("button");
    outside.textContent = "Outside";
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);

    const container = makeContainer(2);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap({ containerRef: ref, active: true, onEscape });
    });

    // Escape triggers onEscape.
    escape();
    expect(onEscape).toHaveBeenCalledOnce();

    // Unmount restores focus to the previously focused element.
    unmount();
    expect(document.activeElement).toBe(outside);
  });
});
