"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, CheckCircle2, AlertCircle } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { updateBusinessHours, type BusinessHour } from "@/lib/actions/business";
import { cn } from "@/lib/utils";

// Mon..Sat..Sun display order
const DAY_ORDER: { giorno: number; label: string }[] = [
  { giorno: 1, label: "Luned\u00ec" },
  { giorno: 2, label: "Marted\u00ec" },
  { giorno: 3, label: "Mercoled\u00ec" },
  { giorno: 4, label: "Gioved\u00ec" },
  { giorno: 5, label: "Venerd\u00ec" },
  { giorno: 6, label: "Sabato" },
  { giorno: 0, label: "Domenica" },
];

type Row = {
  giorno: number;
  chiuso: boolean;
  apertura: string;
  chiusura: string;
  pausa_inizio: string;
  pausa_fine: string;
};

function hhmm(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
}

function buildRows(initial: BusinessHour[]): Row[] {
  const map = new Map<number, BusinessHour>();
  initial.forEach((h) => map.set(h.giorno, h));
  return DAY_ORDER.map(({ giorno }) => {
    const h = map.get(giorno);
    return {
      giorno,
      chiuso: h?.chiuso ?? (giorno === 0),
      apertura: hhmm(h?.apertura) || (giorno === 0 ? "" : "09:00"),
      chiusura: hhmm(h?.chiusura) || (giorno === 0 ? "" : "19:00"),
      pausa_inizio: hhmm(h?.pausa_inizio),
      pausa_fine: hhmm(h?.pausa_fine),
    };
  });
}

export function OrariForm({ initial }: { initial: BusinessHour[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>(buildRows(initial));

  function update(idx: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    startTransition(async () => {
      try {
        await updateBusinessHours(
          rows.map((r) => ({
            giorno: r.giorno,
            chiuso: r.chiuso,
            apertura: r.chiuso ? null : r.apertura || null,
            chiusura: r.chiuso ? null : r.chiusura || null,
            pausa_inizio: r.chiuso ? null : r.pausa_inizio || null,
            pausa_fine: r.chiuso ? null : r.pausa_fine || null,
          }))
        );
        setOk("Orari salvati.");
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Errore salvataggio");
      }
    });
  }

  const labelFor = (g: number) => DAY_ORDER.find((d) => d.giorno === g)?.label ?? "";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="divide-y divide-border rounded-lg border border-border">
        {rows.map((r, idx) => (
          <div
            key={r.giorno}
            className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[9rem_auto_1fr] sm:items-center"
          >
            <div className="font-medium">{labelFor(r.giorno)}</div>

            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={r.chiuso}
                onChange={(e) => update(idx, { chiuso: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              <span className={cn(r.chiuso ? "text-foreground" : "text-muted-foreground")}>
                Chiuso
              </span>
            </label>

            {r.chiuso ? (
              <div className="text-sm italic text-muted-foreground sm:text-right">
                &mdash;
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <TimeField
                  label="Apertura"
                  value={r.apertura}
                  onChange={(v) => update(idx, { apertura: v })}
                />
                <TimeField
                  label="Chiusura"
                  value={r.chiusura}
                  onChange={(v) => update(idx, { chiusura: v })}
                />
                <span className="hidden text-xs text-muted-foreground sm:inline">|</span>
                <TimeField
                  label="Pausa da"
                  value={r.pausa_inizio}
                  onChange={(v) => update(idx, { pausa_inizio: v })}
                />
                <TimeField
                  label="Pausa a"
                  value={r.pausa_fine}
                  onChange={(v) => update(idx, { pausa_fine: v })}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}
      {ok && (
        <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{ok}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? "Salvataggio\u2026" : "Salva orari"}
        </Button>
      </div>
    </form>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="hidden sm:inline">{label}</span>
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-[7.5rem] text-sm"
        aria-label={label}
      />
    </label>
  );
}
