"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";

// ============================================
// PeriodSelector
// Presets (Oggi / Ieri / Settimana / Mese / Trimestre / Anno / Custom)
// Gestisce lo stato via searchParams URL `?from=YYYY-MM-DD&to=YYYY-MM-DD`.
// ============================================

export type PresetKey =
  | "oggi"
  | "ieri"
  | "settimana"
  | "mese"
  | "trimestre"
  | "anno"
  | "custom";

const PRESET_LABELS: Record<PresetKey, string> = {
  oggi: "Oggi",
  ieri: "Ieri",
  settimana: "Settimana",
  mese: "Mese",
  trimestre: "Trimestre",
  anno: "Anno",
  custom: "Custom",
};

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Given a preset key, returns {from, to} in YYYY-MM-DD. */
export function computePreset(preset: PresetKey): { from: string; to: string } {
  const now = new Date();
  const todayStr = ymd(now);
  switch (preset) {
    case "oggi":
      return { from: todayStr, to: todayStr };
    case "ieri": {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const s = ymd(y);
      return { from: s, to: s };
    }
    case "settimana": {
      // Lun-Dom (or oggi - 6..oggi per semplicità: ultimi 7 giorni inclusi)
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { from: ymd(start), to: todayStr };
    }
    case "mese": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: ymd(start), to: ymd(end) };
    }
    case "trimestre": {
      const q = Math.floor(now.getMonth() / 3); // 0..3
      const start = new Date(now.getFullYear(), q * 3, 1);
      const end = new Date(now.getFullYear(), q * 3 + 3, 0);
      return { from: ymd(start), to: ymd(end) };
    }
    case "anno": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { from: ymd(start), to: ymd(end) };
    }
    case "custom":
    default: {
      // default to current month
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: ymd(start), to: todayStr };
    }
  }
}

/** Helper server-side: estrae il periodo dai searchParams. */
export function parsePeriodoFromSearchParams(
  sp: Record<string, string | string[] | undefined> | URLSearchParams,
): { from: string; to: string } {
  const get = (k: string): string | undefined => {
    if (sp instanceof URLSearchParams) return sp.get(k) ?? undefined;
    const v = sp[k];
    if (Array.isArray(v)) return v[0];
    return v;
  };
  const from = get("from");
  const to = get("to");
  const isValid = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (isValid(from) && isValid(to)) return { from: from!, to: to! };
  return computePreset("mese");
}

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
