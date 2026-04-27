export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { KpiCard } from "@/components/reports/kpi-card";
import { PeriodSelector } from "@/components/reports/period-selector";
import { EmptyTableRow } from "@/components/reports/empty-table";
import { parsePeriodoFromSearchParams } from "@/lib/reports/period";
import { RevenueChart, CHART_COLORS } from "@/components/reports/revenue-chart";
import { getSalesReport } from "@/lib/actions/reports";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Euro,
  Receipt,
  TrendingUp,
  Tag,
} from "lucide-react";

// ============================================
// /reports/vendite — Wave 4 Agent B
//
// KPI cards + grafico trend fatturato giornaliero +
// top 10 clienti per spesa + breakdown per kind.
// ============================================

const KIND_LABELS: Record<string, string> = {
  servizio: "Servizio",
  prodotto: "Prodotto",
  voucher: "Voucher",
  abbonamento: "Abbonamento",
  card_regalo: "Card regalo",
  altro: "Altro",
};

export default async function VenditePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const periodo = parsePeriodoFromSearchParams(sp);
  const report = await getSalesReport(periodo);

  const chartData =
    report.byDay.length > 60
      ? (() => {
          const byMonth = new Map<string, number>();
          for (const d of report.byDay) {
            const mese = d.data.slice(0, 7);
            byMonth.set(mese, (byMonth.get(mese) ?? 0) + d.fatturato);
          }
          return Array.from(byMonth.entries())
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([label, fatturato]) => ({ label, fatturato }));
        })()
      : report.byDay.map((d) => ({
          label: d.data.slice(5), // "MM-DD"
          fatturato: d.fatturato,
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
        <h1 className="font-serif text-3xl font-bold tracking-tight">Report vendite</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analisi dettagliata del fatturato, clienti e composizione per tipo.
        </p>
      </header>

      <div className="mb-6">
        <PeriodSelector />
      </div>

      {/* KPI cards */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Euro className="h-5 w-5" />}
          label="Fatturato totale"
          value={formatCurrency(report.fatturatoTotale)}
        />
        <KpiCard
          icon={<Receipt className="h-5 w-5" />}
          label="Transazioni"
          value={report.transazioni.toLocaleString("it-IT")}
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Ticket medio"
          value={formatCurrency(report.ticketMedio)}
        />
        <KpiCard
          icon={<Tag className="h-5 w-5" />}
          label="Sconti applicati"
          value={formatCurrency(report.scontoTotale)}
        />
      </section>

      {/* Grafico trend fatturato giornaliero */}
      <section className="mb-6">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">
              {report.byDay.length > 60
                ? "Trend fatturato mensile"
                : "Trend fatturato giornaliero"}
            </h2>
            {chartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nessuna vendita nel periodo.
              </p>
            ) : (
              <div className="mt-4">
                <RevenueChart
                  data={chartData}
                  variant="bar"
                  unit="eur"
                  series={[
                    { dataKey: "fatturato", label: "Fatturato", color: CHART_COLORS.rose },
                  ]}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Top 10 clienti + breakdown per kind */}
      <section className="grid gap-4 md:grid-cols-5">
        {/* Top 10 clienti per spesa */}
        <Card className="md:col-span-3">
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">Top 10 clienti per spesa</h2>
            <table className="mt-4 w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2 text-left font-medium">Cliente</th>
                  <th className="pb-2 text-right font-medium">Visite</th>
                  <th className="pb-2 text-right font-medium">Spesa totale</th>
                  <th className="pb-2 text-right font-medium">Ticket medio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.topClienti.length === 0 && (
                  <EmptyTableRow
                    colSpan={4}
                    message="Nessun cliente con acquisti nel periodo."
                  />
                )}
                {report.topClienti.map((c) => (
                  <tr key={c.clientId}>
                    <td className="py-2.5 font-medium">
                      {c.nome} {c.cognome}
                    </td>
                    <td className="py-2.5 text-right">{c.visite}</td>
                    <td className="py-2.5 text-right font-semibold">
                      {formatCurrency(c.spesa)}
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {formatCurrency(c.ticketMedio)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Breakdown per kind */}
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">Composizione per tipo</h2>
            <table className="mt-4 w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2 text-left font-medium">Tipo</th>
                  <th className="pb-2 text-right font-medium">N.</th>
                  <th className="pb-2 text-right font-medium">Fatturato</th>
                  <th className="pb-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.byKind.length === 0 && (
                  <EmptyTableRow colSpan={4} message="Nessun dato." />
                )}
                {report.byKind.map((k) => (
                  <tr key={k.kind}>
                    <td className="py-2.5 font-medium capitalize">
                      {KIND_LABELS[k.kind] ?? k.kind}
                    </td>
                    <td className="py-2.5 text-right">{k.count}</td>
                    <td className="py-2.5 text-right">{formatCurrency(k.fatturato)}</td>
                    <td className="py-2.5 text-right text-muted-foreground text-xs">
                      {k.pct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
