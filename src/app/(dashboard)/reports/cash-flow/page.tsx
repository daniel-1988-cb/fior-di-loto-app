export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { PeriodSelector } from "@/components/reports/period-selector";
import { parsePeriodoFromSearchParams } from "@/lib/reports/period";
import { RevenueChart, CHART_COLORS } from "@/components/reports/revenue-chart";
import { getCashFlow } from "@/lib/actions/reports";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, Percent } from "lucide-react";

// ============================================
// /reports/cash-flow — Fase 5
//
// PeriodSelector + card entrate/uscite/netto/margine + grafico a barre
// entrate vs uscite per giorno + tabella aggregata per mese.
// ============================================

function groupByMonth(
  byDay: Array<{ data: string; entrate: number; uscite: number; netto: number }>,
) {
  const map = new Map<string, { mese: string; entrate: number; uscite: number; netto: number }>();
  for (const d of byDay) {
    const mese = d.data.slice(0, 7);
    if (!map.has(mese)) map.set(mese, { mese, entrate: 0, uscite: 0, netto: 0 });
    const e = map.get(mese)!;
    e.entrate += d.entrate;
    e.uscite += d.uscite;
    e.netto += d.netto;
  }
  return Array.from(map.values()).sort((a, b) => (a.mese < b.mese ? -1 : 1));
}

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const periodo = parsePeriodoFromSearchParams(sp);
  const cashFlow = await getCashFlow(periodo);

  const byMonth = groupByMonth(cashFlow.byDay);

  // Limit chart to at most ~60 points (2 months) per readability. Oltre, aggrega a mese.
  const chartData =
    cashFlow.byDay.length > 60
      ? byMonth.map((m) => ({
          label: m.mese,
          entrate: Math.round(m.entrate),
          uscite: Math.round(m.uscite),
        }))
      : cashFlow.byDay.map((d) => ({
          label: d.data.slice(5), // "MM-DD"
          entrate: Math.round(d.entrate),
          uscite: Math.round(d.uscite),
        }));

  return (
    <>
      <header className="mb-6">
        <Link
          href="/reports"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Reports
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Cash flow</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Entrate vs uscite del periodo con dettaglio giornaliero.
        </p>
      </header>

      <div className="mb-6">
        <PeriodSelector />
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Entrate"
          value={formatCurrency(cashFlow.totale.entrate)}
          variant="success"
        />
        <SummaryCard
          icon={<TrendingDown className="h-5 w-5" />}
          label="Uscite"
          value={formatCurrency(cashFlow.totale.uscite)}
          variant="danger"
        />
        <SummaryCard
          icon={<Wallet className="h-5 w-5" />}
          label="Netto"
          value={formatCurrency(cashFlow.totale.netto)}
          variant={cashFlow.totale.netto >= 0 ? "success" : "danger"}
        />
        <SummaryCard
          icon={<Percent className="h-5 w-5" />}
          label="Margine"
          value={`${cashFlow.totale.margine.toFixed(1)}%`}
          variant={cashFlow.totale.margine >= 0 ? "success" : "danger"}
        />
      </section>

      <section className="mb-6">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">
              {cashFlow.byDay.length > 60 ? "Entrate vs uscite per mese" : "Entrate vs uscite per giorno"}
            </h2>
            {chartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nessuna transazione nel periodo.
              </p>
            ) : (
              <div className="mt-4">
                <RevenueChart
                  data={chartData}
                  variant="bar"
                  unit="eur"
                  series={[
                    { dataKey: "entrate", label: "Entrate", color: CHART_COLORS.success },
                    { dataKey: "uscite", label: "Uscite", color: CHART_COLORS.danger },
                  ]}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">Dettaglio per mese</h2>
            <table className="mt-4 w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2 text-left font-medium">Mese</th>
                  <th className="pb-2 text-right font-medium">Entrate</th>
                  <th className="pb-2 text-right font-medium">Uscite</th>
                  <th className="pb-2 text-right font-medium">Netto</th>
                  <th className="pb-2 text-right font-medium">Margine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {byMonth.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                      Nessun dato.
                    </td>
                  </tr>
                )}
                {byMonth.map((m) => {
                  const margine = m.entrate > 0 ? (m.netto / m.entrate) * 100 : 0;
                  return (
                    <tr key={m.mese}>
                      <td className="py-2.5 font-medium">{m.mese}</td>
                      <td className="py-2.5 text-right text-success">
                        {formatCurrency(m.entrate)}
                      </td>
                      <td className="py-2.5 text-right text-danger">
                        {formatCurrency(m.uscite)}
                      </td>
                      <td
                        className={`py-2.5 text-right font-semibold ${
                          m.netto >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {formatCurrency(m.netto)}
                      </td>
                      <td className="py-2.5 text-right text-xs">
                        {margine.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  variant: "success" | "danger" | "neutral";
}) {
  const tint =
    variant === "success"
      ? "bg-success/10 text-success"
      : variant === "danger"
      ? "bg-danger/10 text-danger"
      : "bg-primary/10 text-primary";
  return (
    <Card className="p-5">
      <div className={`inline-flex rounded-lg p-2 ${tint}`}>{icon}</div>
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
}
