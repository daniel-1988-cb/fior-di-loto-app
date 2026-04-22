"use client";

import Link from "next/link";
import { X, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuickActions } from "@/lib/quick-actions/storage";
import { cn } from "@/lib/utils";
import type { QuickAction } from "@/lib/quick-actions/types";

export type QuickActionsMenuProps = {
  /**
   * - "popover": header con orario + X button (click su slot vuoto).
   * - "dropdown": niente header, lista secca (bottone "Aggiungi" in toolbar).
   */
  mode: "popover" | "dropdown";
  /** Orario dello slot cliccato (es. "12:00") — mostrato come titolo in modalità popover. */
  slotTime?: string;
  slotDate?: string;
  slotStaffId?: string;
  /** Chiamato quando si clicca X, un'azione, o il link impostazioni. */
  onClose: () => void;
};

export function QuickActionsMenu({
  mode,
  slotTime,
  slotDate,
  slotStaffId,
  onClose,
}: QuickActionsMenuProps) {
  const { enabledActions, actions, mounted } = useQuickActions();
  const router = useRouter();

  // Pre-mount (SSR / prima del useEffect di storage): mostra i default
  // così non vedi "buca" nel popover. mounted flag evita mismatch perché
  // il primo render è coerente su server e client.
  const list = mounted ? enabledActions : actions.filter((a) => a.enabledByDefault);

  const handleAction = (action: QuickAction & { enabled: boolean }) => {
    if (!action.implemented) return;
    const href = action.buildHref({
      date: slotDate,
      time: slotTime,
      staffId: slotStaffId,
    });
    if (!href) return;
    onClose();
    router.push(href);
  };

  return (
    <div
      className={cn(
        "w-72 overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-xl",
      )}
      role="menu"
      aria-label="Azioni rapide"
    >
      {mode === "popover" && (
        <>
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-base font-semibold text-foreground">
              {slotTime ?? ""}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-px bg-border" aria-hidden />
        </>
      )}

      <ul className="py-1">
        {list.length === 0 && (
          <li className="px-3 py-2.5 text-sm text-muted-foreground">
            Nessuna azione abilitata.
          </li>
        )}
        {list.map((action) => {
          const Icon = action.icon;
          const disabled = !action.implemented;
          const baseClass = cn(
            "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
            disabled
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:bg-muted",
          );
          const content = (
            <>
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1 truncate text-foreground">{action.label}</span>
            </>
          );
          return (
            <li key={action.id} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={disabled}
                title={disabled ? "Prossimamente" : undefined}
                aria-disabled={disabled}
                onClick={() => handleAction(action)}
                className={baseClass}
              >
                {content}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="h-px bg-border" aria-hidden />
      <Link
        href="/impostazioni/azioni-rapide"
        onClick={onClose}
        className="flex items-center gap-2 px-3 py-2.5 text-sm text-rose transition-colors hover:bg-muted"
      >
        <Settings2 className="h-4 w-4" aria-hidden />
        Impostazioni azioni rapide
      </Link>
    </div>
  );
}
