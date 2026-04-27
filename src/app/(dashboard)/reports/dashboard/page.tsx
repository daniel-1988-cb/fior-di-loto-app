export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { PagamentiPieChart } from "./pie-chart-client";
import { PeriodSelector } from "@/components/reports/period-selector";
import { KpiCard } from "@/components/reports/kpi-card";
import { RevenueChart, CHART_COLORS } from "@/components/reports/revenue-chart";
import { parsePeriodoFromSearchParams } from "@/lib/reports/period";
import {
  getCashFlow,
  getKpiOverview,
  getServicePerformance,
  getDashboardOverview,
} from "@/lib/actions/reports";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarX2,
  UserX,
  CalendarDays,
  CheckCircle,
} from "lucide-react";

// ============================================
// /reports/dashboard — Wave 4 Agent A
//
// Vista sintetica visuale con:
//  1. Trend fatturato (line chart byDay o byMonth)
//  2. Distribuzione metodi pagamento (pie chart — client component)
//  3. Top 5 categorie servizi (bar chart orizzontale)
//  4. Statistiche operatività (4 mini-card)
// ============================================

const METODO_LABEL: Record<string, string> = {
  contanti: "Contanti",
  carta: "Carta",
  bonifico: "Bonifico",
  split: "Split",
  altro: "Altro",
};

function groupByMonth(
  byDay: Array<{ data: string; entrate: number; uscite: number; netto: number }>,
) {
  const map = new Map<string, { mese: string; entrate: number }>();
  for (const d of byDay) {
    const mese = d.data.slice(0, 7);
    if (!map.has(mese)) map.set(mese, { mese, entrate: 0 });
    map.get(mese)!.entrate += d.entrate;
  }
  return Array.from(map.values()).sort((a, b) => (a.mese < b.mese ? -1 : 1));
}

export default async function DashboardReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const periodo = parsePeriodoFromSearchParams(sp);

  const [cashFlow, kpi, servizi, overview] = await Promise.all([
    getCashFlow(periodo),
    getKpiOverview(periodo),
    getServicePerformance(periodo),
    getDashboardOverview(periodo),
  ]);

  // --- Sezione 1: Trend fatturato ---
  const useMonthly = cashFlow.byDay.length > 60;
  const trendData = useMonthly
    ? groupByMonth(cashFlow.byDay).map((m) => ({
        label: m.mese,
        entrate: Math.round(m.entrate),
      }))
    : cashFlow.byDay.map((d) => ({
        label: d.data.slice(5), // "MM-DD"
        entrate: Math.round(d.entrate),
      }));

  // --- Sezione 2: Pie chart pagamenti ---
  const pieData = overview.pagamentiBreakdown.map((p) => ({
    name: METODO_LABEL[p.metodo] ?? p.metodo,
    value: Math.round(p.importo),
  }));

  // --- Sezione 3: Top 5 categorie ---
  const categorieMap = new Map<string, number>();
  for (const s of servizi) {
    const cat = s.categoria || "Altro";
    categorieMap.set(cat, (categorieMap.get(cat) ?? 0) + s.fatturato);
  }
  const categorieData = Array.from(categorieMap.entries())
    .map(([label, fatturato]) => ({ label, fatturato: Math.round(fatturato) }))
    .sort((a, b) => b.fatturato - a.fatturato)
    .slice(0, 5);

  // --- Sezione 4: Operatività ---
  const { appOperativi } = overview;
  const tassoCompletamento =
    appOperativi.totali > 0
      ? Math.round((appOperativi.completati / appOperativi.totali) * 100)
      : 0;
  const tassoNoShow =
    appOperativi.totali > 0
      ? Math.round((appOperativi.noShow / appOperativi.totali) * 100)
      : 0;
  const tassoCancellazioni =
    appOperativi.totali > 0
      ? Math.round((appOperativi.cancellati / appOperativi.totali) * 100)
      : 0;

  return (
    <>
      {/* Header */}
      <header className="mb-6">
        <Link
          href="/reports"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Reports
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Dashboard report
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vista sintetica delle metriche chiave
        </p>
      </header>

      {/* Period selector */}
      <div className="mb-6">
        <PeriodSelector />
      </div>

      {/* Sezione 1 — Trend fatturato */}
      <section className="mb-6">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">
              Trend fatturato
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {useMonthly ? "aggregato per mese" : "per giorno"}
              </span>
            </h2>
            {trendData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nessuna transazione nel periodo.
              </p>
            ) : (
              <div className="mt-4">
                <RevenueChart
                  data={trendData}
                  variant="line"
                  unit="eur"
                  height={280}
                  series={[
                    {
                      dataKey: "entrate",
                      label: "Entrate",
                      color: CHART_COLORS.rose,
                    },
                  ]}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Sezione 2 + 3 — Pagamenti & Categorie */}
      <section className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Distribuzione metodi pagamento */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">Metodi di pagamento</h2>
            <p className="text-xs text-muted-foreground">
              Distribuzione per importo nel periodo.
            </p>
            {pieData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nessuna transazione nel periodo.
              </p>
            ) : (
              <div className="mt-4">
                <PagamentiPieChart data={pieData} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 categorie servizi */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">Top categorie servizi</h2>
            <p className="text-xs text-muted-foreground">
              Fatturato per categoria nel periodo.
            </p>
            {categorieData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nessun servizio erogato nel periodo.
              </p>
            ) : (
              <div className="mt-4">
                <RevenueChart
                  data={categorieData}
                  variant="bar"
                  unit="eur"
                  height={260}
                  series={[
                    {
                      dataKey: "fatturato",
                      label: "Fatturato",
                      color: CHART_COLORS.primary,
                    },
                  ]}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Sezione 4 — Statistiche operatività */}
      <section className="mb-6">
        <h2 className="mb-3 text-base font-semibold">Operatività appuntamenti</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<CheckCircle className="h-5 w-5" />}
            label="Tasso completamento"
            value={`${tassoCompletamento}%`}
            subtitle={`${appOperativi.completati} / ${appOperativi.totali} appuntamenti`}
            delta={tassoCompletamento - 80}
          />
          <KpiCard
            icon={<UserX className="h-5 w-5" />}
            label="No-show rate"
            value={`${tassoNoShow}%`}
            subtitle={`${appOperativi.noShow} no-show`}
          />
          <KpiCard
            icon={<CalendarX2 className="h-5 w-5" />}
            label="Cancellazioni"
            value={`${tassoCancellazioni}%`}
            subtitle={`${appOperativi.cancellati} cancellati`}
          />
          <KpiCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Media app/giorno"
            value={String(appOperativi.mediaPerGiorno)}
            subtitle={`${appOperativi.totali} totali nel periodo`}
          />
        </div>
      </section>

      {/* KPI overview rapido */}
      <section className="mb-6">
        <h2 className="mb-3 text-base font-semibold">KPI periodo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            icon={<CalendarCheck className="h-5 w-5" />}
            label="Fatturato totale"
            value={formatCurrency(kpi.fatturatoTotale)}
            subtitle={`ticket medio ${formatCurrency(kpi.ticketMedio)}`}
            delta={
              kpi.fatturatoMesePrec > 0
                ? ((kpi.fatturatoTotale - kpi.fatturatoMesePrec) /
                    kpi.fatturatoMesePrec) *
                  100
                : undefined
            }
          />
          <KpiCard
            icon={<CalendarCheck className="h-5 w-5" />}
            label="Clienti attivi"
            value={String(kpi.clientiAttivi)}
            subtitle={`${kpi.nuoviClienti} nuovi nel periodo`}
          />
          <KpiCard
            icon={<CalendarCheck className="h-5 w-5" />}
            label="Appuntamenti completati"
            value={String(kpi.appuntamentiCompletati)}
            subtitle="stato = completato"
          />
        </div>
      </section>
    </>
  );
}
