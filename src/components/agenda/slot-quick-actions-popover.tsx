"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { QuickActionsMenu } from "./quick-actions-menu";

const MENU_WIDTH = 288; // w-72
const MENU_MAX_HEIGHT = 360;
const VIEWPORT_MARGIN = 8;

type Props = {
  open: boolean;
  x: number;
  y: number;
  slotTime: string;
  slotDate: string;
  slotStaffId?: string;
  onClose: () => void;
};

/**
 * Popover assoluto (position: fixed) che mostra la menu azioni rapide.
 * Clamp al viewport: se il menu uscirebbe a destra/sotto, sposta su/sinistra.
 * Chiude su click-outside, Escape e click su azione.
 */
export function SlotQuickActionsPopover({
  open,
  x,
  y,
  slotTime,
  slotDate,
  slotStaffId,
  onClose,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: x, top: y });

  // Riposiziona il popover quando cambia (open/x/y) e clampa al viewport.
  // useLayoutEffect per evitare flash della posizione non clampata.
  useLayoutEffect(() => {
    if (!open || typeof window === "undefined") return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const el = menuRef.current;
    const height = el?.offsetHeight ?? MENU_MAX_HEIGHT;

    let left = x;
    let top = y;
    if (left + MENU_WIDTH + VIEWPORT_MARGIN > vw) {
      left = Math.max(VIEWPORT_MARGIN, x - MENU_WIDTH);
    }
    if (top + height + VIEWPORT_MARGIN > vh) {
      top = Math.max(VIEWPORT_MARGIN, y - height);
    }
    setPos({ left, top });
  }, [open, x, y]);

  // Escape chiude. Click outside chiude.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    // mousedown (non click) così chiudiamo prima che si attivi l'apertura di un altro popover sullo slot adiacente.
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50"
      style={{ left: pos.left, top: pos.top }}
      role="dialog"
      aria-modal="false"
    >
      <QuickActionsMenu
        mode="popover"
        slotTime={slotTime}
        slotDate={slotDate}
        slotStaffId={slotStaffId}
        onClose={onClose}
      />
    </div>
  );
}
