export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { getCohortRetention } from "@/lib/actions/reports";
import { ArrowLeft } from "lucide-react";

// ============================================
// /reports/cohort — Fase 5
//
// Heatmap cohort retention: righe = mese primo acquisto (M0..),
// colonne = M0/M1/M2.../M12 con % retention celle colorate.
//
// "% clienti del mese X che sono tornati nel mese X+N".
//
// Anno scelto via searchParams `?year=YYYY`. Default: anno corrente.
// ============================================

function parseYearParam(
  sp: Record<string, string | string[] | undefined>,
): number {
  const raw = sp?.year;
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(v);
  if (Number.isFinite(n) && n >= 2020 && n <= 2100) return Math.floor(n);
  return new Date().getFullYear();
}

function heatColor(pct: number, maxOthers: number): string {
  // M0 è sempre 100% quando il cohort esiste; per M1+ coloriamo
  // proporzionalmente al max dei non-M0 nella riga. Evita che M0 "saturi" la scala.
  if (pct <= 0) return "bg-muted/30";
  const base = maxOthers > 0 ? Math.min(pct / maxOthers, 1) : 0;
  // bucket in 5 livelli di intensità
  if (base >= 0.8) return "bg-primary/60 text-primary-foreground";
  if (base >= 0.6) return "bg-primary/45 text-primary-foreground";
  if (base >= 0.4) return "bg-primary/30";
  if (base >= 0.2) return "bg-primary/20";
  return "bg-primary/10";
}

export default async function CohortPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const year = parseYearParam(sp);
  const data = await getCohortRetention(year);

  const YEARS = [2024, 2025, 2026];

  const hasAny = data.cohorts.some((c) => c.size > 0);

  return (
    <>
      <header className="mb-6">
        <Link
          href="/reports"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Reports
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Cohort retention</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          % clienti del mese X che sono tornati nel mese X+N. Aggregato dai primi acquisti
          registrati nelle transazioni.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Anno
        </span>
        {YEARS.map((y) => (
          <Link
            key={y}
            href={`/reports/cohort?year=${y}`}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              y === year
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {!hasAny ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nessun nuovo cliente con acquisti nel {year}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="sticky left-0 z-10 bg-card px-2 py-2 text-left font-medium uppercase tracking-wider">
                      Cohort
                    </th>
                    <th className="px-2 py-2 text-right font-medium uppercase tracking-wider">
                      Size
                    </th>
                    {Array.from({ length: 13 }).map((_, i) => (
                      <th
                        key={i}
                        className="px-2 py-2 text-center font-medium uppercase tracking-wider"
                      >
                        M{i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.cohorts.map((c) => {
                    const maxOthers = Math.max(
                      0,
                      ...c.retention.slice(1).filter((v) => Number.isFinite(v)),
                    );
                    return (
                      <tr key={c.mese} className="border-t border-border">
                        <td className="sticky left-0 z-10 bg-card px-2 py-2 font-medium">
                          {c.mese}
                        </td>
                        <td className="px-2 py-2 text-right text-muted-foreground">{c.size}</td>
                        {c.retention.map((pct, idx) => {
                          if (c.size === 0) {
                            return (
                              <td key={idx} className="px-2 py-2 text-center text-muted-foreground">
                                —
                              </td>
                            );
                          }
                          return (
                            <td
                              key={idx}
                              className={`px-2 py-2 text-center font-semibold ${heatColor(pct, maxOthers)}`}
                              title={`${c.mese} → ${pct.toFixed(1)}% (M${idx})`}
                            >
                              {pct.toFixed(0)}%
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Nota: M0 è sempre 100% (mese del primo acquisto). L&apos;intensità del colore nelle colonne
        M1+ è relativa al massimo della riga per rendere leggibile il decay.
      </p>
    </>
  );
}
