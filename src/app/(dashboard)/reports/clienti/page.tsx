export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { KpiCard } from "@/components/reports/kpi-card";
import { EmptyTableRow } from "@/components/reports/empty-table";
import { PeriodSelector } from "@/components/reports/period-selector";
import { RevenueChart, CHART_COLORS } from "@/components/reports/revenue-chart";
import { parsePeriodoFromSearchParams } from "@/lib/reports/period";
import { getClientReport } from "@/lib/actions/reports";
import { formatCurrency } from "@/lib/utils";
import { getSegmentoStyle, getSegmentoLabel } from "@/lib/clienti/segmenti";
import {
  ArrowLeft,
  Users,
  UserPlus,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

// ============================================
// /reports/clienti — Wave 4 Agent C
//
// Analytics clienti: KPI attivi/nuovi/retention/LTV,
// distribuzione segmenti, top 10 per LTV, distribuzione spesa.
// ============================================

export default async function ReportClientiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const periodo = parsePeriodoFromSearchParams(sp);
  const report = await getClientReport(periodo);

  // Chart data: segmenti distribution
  const segmentiChart = report.segmenti.map((s) => ({
    label: getSegmentoLabel(s.segmento),
    count: s.count,
  }));

  // Chart data: spesa distribution
  const spesaChart = report.spesaDistribution.map((b) => ({
    label: b.bin,
    count: b.count,
  }));

  const retentionPct = Math.round(report.retentionRate * 1000) / 10; // 0..100 with 1 decimal

  return (
    <>
      <header className="mb-6">
        <Link
          href="/reports"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Reports
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Report clienti</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comportamento e valore della clientela.
        </p>
      </header>

      <div className="mb-6">
        <PeriodSelector />
      </div>

      {/* KPI cards */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Clienti attivi"
          value={String(report.clientiAttivi)}
          subtitle="almeno 1 transazione o appuntamento"
        />
        <KpiCard
          icon={<UserPlus className="h-5 w-5" />}
          label="Nuovi clienti"
          value={String(report.nuoviClienti)}
          subtitle="iscritti nel periodo"
        />
        <KpiCard
          icon={<RefreshCw className="h-5 w-5" />}
          label="Tasso retention"
          value={`${retentionPct.toFixed(1)}%`}
          subtitle="clienti del periodo prec. che sono tornati"
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="LTV medio"
          value={formatCurrency(report.ltv_medio)}
          subtitle="spesa media per cliente attivo"
        />
      </section>

      {/* Distribuzione per segmento + Distribuzione spesa */}
      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 text-base font-semibold">Distribuzione per segmento</h2>
            {segmentiChart.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nessun cliente registrato.
              </p>
            ) : (
              <RevenueChart
                data={segmentiChart}
                variant="bar"
                unit="count"
                height={220}
                series={[{ dataKey: "count", label: "Clienti", color: CHART_COLORS.primary }]}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 text-base font-semibold">Distribuzione spesa</h2>
            {spesaChart.every((b) => b.count === 0) ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nessuna transazione nel periodo.
              </p>
            ) : (
              <RevenueChart
                data={spesaChart}
                variant="bar"
                unit="count"
                height={220}
                series={[{ dataKey: "count", label: "Clienti", color: CHART_COLORS.rose }]}
              />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Top 10 clienti per LTV */}
      <section className="mb-6">
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 text-base font-semibold">Top 10 clienti per spesa</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="pb-2 text-left font-medium">Cliente</th>
                    <th className="pb-2 text-left font-medium">Segmento</th>
                    <th className="pb-2 text-right font-medium">Visite</th>
                    <th className="pb-2 text-right font-medium">Spesa totale</th>
                    <th className="pb-2 text-right font-medium">Ultima visita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.topLtv.length === 0 && (
                    <EmptyTableRow
                      colSpan={5}
                      message="Nessun cliente con transazioni nel periodo."
                    />
                  )}
                  {report.topLtv.map((c) => (
                    <tr key={c.clientId}>
                      <td className="py-2.5 font-medium">
                        {c.nome} {c.cognome}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getSegmentoStyle(c.segmento)}`}
                        >
                          {getSegmentoLabel(c.segmento)}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">{c.visite}</td>
                      <td className="py-2.5 text-right font-semibold">
                        {formatCurrency(c.spesa)}
                      </td>
                      <td className="py-2.5 text-right text-xs text-muted-foreground">
                        {c.ultimaVisita ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
