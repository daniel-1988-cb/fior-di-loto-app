"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ProfileTabKey =
  | "panoramica"
  | "appuntamenti"
  | "vendite"
  | "dettagli"
  | "articoli"
  | "documenti"
  | "portafoglio"
  | "fedelta"
  | "recensioni";

export type ProfileTabContents = Partial<Record<ProfileTabKey, ReactNode>>;

interface Props {
  contents: ProfileTabContents;
  counts: {
    appuntamenti: number;
    vendite: number;
    articoli: number;
  };
  /** /clienti/[id]/modifica — kept for backward compat, not used now */
  editHref: string;
}

const ORDER: Array<{ key: ProfileTabKey; label: string; countKey?: keyof Props["counts"] }> = [
  { key: "panoramica", label: "Panoramica" },
  { key: "appuntamenti", label: "Appuntamenti", countKey: "appuntamenti" },
  { key: "vendite", label: "Vendite", countKey: "vendite" },
  { key: "dettagli", label: "Dettagli cliente" },
  { key: "articoli", label: "Articoli", countKey: "articoli" },
  { key: "documenti", label: "Documenti" },
  { key: "portafoglio", label: "Portafoglio" },
  { key: "fedelta", label: "Programma fedeltà" },
  { key: "recensioni", label: "Recensioni" },
];

export function ClientProfileTabs({ contents, counts }: Props) {
  const [active, setActive] = useState<ProfileTabKey>("panoramica");

  const content = contents[active] ?? <FallbackTab />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
      {/* Vertical tab menu */}
      <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-2 lg:mx-0 px-2 lg:px-0 pb-2 lg:pb-0">
        {ORDER.map(({ key, label, countKey }) => {
          const n = countKey ? counts[countKey] : undefined;
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={cn(
                "flex shrink-0 lg:shrink items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                isActive
                  ? "bg-rose/10 font-medium text-rose"
                  : "text-muted-foreground hover:bg-muted hover:text-brown",
              )}
            >
              <span className="flex items-center gap-2">
                {label}
                {n !== undefined && n > 0 && (
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs",
                      isActive
                        ? "bg-rose/15 text-rose"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {n}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Selected tab content */}
      <div className="min-w-0">{content}</div>
    </div>
  );
}

/**
 * Fallback per tab non popolati. In condizioni normali tutti i tab ricevono
 * un content dal page.tsx — questo è solo difesa.
 */
function FallbackTab() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">Nessun contenuto.</p>
    </div>
  );
}
