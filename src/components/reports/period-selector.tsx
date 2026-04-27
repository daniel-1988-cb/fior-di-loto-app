"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  type PresetKey,
  PRESET_LABELS,
  computePreset,
  parsePeriodoFromSearchParams,
} from "@/lib/reports/period";

// Re-export for backwards compatibility
export { computePreset, parsePeriodoFromSearchParams };
export type { PresetKey };

const PRESET_ORDER: PresetKey[] = [
  "oggi",
  "ieri",
  "settimana",
  "mese",
  "trimestre",
  "anno",
];

export function PeriodSelector({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";

  const [from, setFrom] = useState(fromParam || computePreset("mese").from);
  const [to, setTo] = useState(toParam || computePreset("mese").to);
  const [activePreset, setActivePreset] = useState<PresetKey>(() => {
    if (!fromParam || !toParam) return "mese";
    for (const k of PRESET_ORDER) {
      const p = computePreset(k);
      if (p.from === fromParam && p.to === toParam) return k;
    }
    return "custom";
  });

  useEffect(() => {
    setFrom(fromParam || computePreset("mese").from);
    setTo(toParam || computePreset("mese").to);
  }, [fromParam, toParam]);

  function applyToUrl(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", nextFrom);
    params.set("to", nextTo);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handlePresetClick(k: PresetKey) {
    setActivePreset(k);
    if (k === "custom") return; // lascia input date per l'utente
    const p = computePreset(k);
    setFrom(p.from);
    setTo(p.to);
    applyToUrl(p.from, p.to);
  }

  function handleCustomApply() {
    if (!from || !to) return;
    setActivePreset("custom");
    applyToUrl(from, to);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESET_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handlePresetClick(k)}
            disabled={isPending}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              activePreset === k
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {PRESET_LABELS[k]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handlePresetClick("custom")}
          disabled={isPending}
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            activePreset === "custom"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          {PRESET_LABELS.custom}
        </button>
      </div>

      {activePreset === "custom" ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 w-auto text-xs"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 w-auto text-xs"
          />
          <button
            type="button"
            onClick={handleCustomApply}
            disabled={isPending}
            className="inline-flex items-center rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Applica
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {from} → {to}
        </p>
      )}
    </div>
  );
}
