"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: "right" | "left";
  width?: "sm" | "md" | "lg" | "xl";
}

const widthMap = {
  sm: "w-full sm:w-96",
  md: "w-full sm:w-[480px]",
  lg: "w-full sm:w-[640px]",
  xl: "w-full sm:w-[800px]",
} as const;

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "right",
  width = "md",
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap({ containerRef: panelRef, active: open, onEscape: onClose });

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" aria-modal="true" role="dialog">
      <button
        aria-label="Chiudi"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 transition-opacity"
      />
      <div
        ref={panelRef}
        className={cn(
          "relative flex flex-col bg-card text-card-foreground shadow-2xl transition-transform",
          widthMap[width],
          side === "right" ? "ml-auto" : "mr-auto"
        )}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
