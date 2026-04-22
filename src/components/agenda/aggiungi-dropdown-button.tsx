"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { QuickActionsMenu } from "./quick-actions-menu";

type Props = {
  /** Data corrente visualizzata in agenda, passata come slotDate alle azioni. */
  currentDate: string;
};

/**
 * Bottone "Aggiungi" in toolbar agenda. Al click apre un dropdown
 * con le stesse azioni rapide del popover su slot vuoto, ma senza
 * header orario (mode dropdown).
 */
export function AggiungiDropdownButton({ currentDate }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Plus className="h-4 w-4" /> Aggiungi
        <ChevronDown className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2">
          <QuickActionsMenu
            mode="dropdown"
            slotDate={currentDate}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
