export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { KpiCard } from "@/components/reports/kpi-card";
import { PeriodSelector } from "@/components/reports/period-selector";
import { EmptyTableRow } from "@/components/reports/empty-table";
import { parsePeriodoFromSearchParams } from "@/lib/reports/period";
import { RevenueChart, CHART_COLORS } from "@/components/reports/revenue-chart";
import {
  getStaffPerformance,
  getTeamHoursReport,
} from "@/lib/actions/reports";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Users, CalendarCheck, Euro } from "lucide-react";

// ============================================
// /reports/team — Wave 4 Agent B
//
// KPI cards + grafico fatturato per staff +
// tabella performance + tabella ferie/presenze.
// ============================================

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const periodo = parsePeriodoFromSearchParams(sp);

  const [staff, teamHours] = await Promise.all([
    getStaffPerformance(periodo),
    getTeamHoursReport(periodo),
  ]);

  // KPI derivate
  const membriAttivi = staff.length;
  const appuntamentiTotali = staff.reduce((s, r) => s + r.appuntamenti, 0);
  const fatturatoMedioStaff =
    membriAttivi > 0
      ? staff.reduce((s, r) => s + r.fatturato, 0) / membriAttivi
      : 0;

  const chartData = staff
    .slice(0, 10)
    .map((s) => ({ label: s.nome, fatturato: Math.round(s.fatturato) }));

  return (
    <>
      <header className="mb-6">
        <Link
          href="/reports"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Reports
        </Link>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Report team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Performance, appuntamenti completati e presenze del personale nel periodo.
        </p>
      </header>

      <div className="mb-6">
        <PeriodSelector />
      </div>

      {/* KPI cards */}
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Membri attivi"
          value={membriAttivi.toLocaleString("it-IT")}
          subtitle="Staff con almeno 1 appuntamento completato"
        />
        <KpiCard
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Appuntamenti completati"
          value={appuntamentiTotali.toLocaleString("it-IT")}
        />
        <KpiCard
          icon={<Euro className="h-5 w-5" />}
          label="Fatturato medio per staff"
          value={formatCurrency(fatturatoMedioStaff)}
        />
      </section>

      {/* Grafico fatturato per staff + tabella performance */}
      <section className="mb-6 grid gap-4 md:grid-cols-5">
        <Card className="md:col-span-3">
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">Tabella performance</h2>
            <table className="mt-4 w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2 text-left font-medium">Staff</th>
                  <th className="pb-2 text-right font-medium">Appt</th>
                  <th className="pb-2 text-right font-medium">Clienti unici</th>
                  <th className="pb-2 text-right font-medium">Media/cliente</th>
                  <th className="pb-2 text-right font-medium">Fatturato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staff.length === 0 && (
                  <EmptyTableRow
                    colSpan={5}
                    message="Nessun appuntamento completato nel periodo."
                  />
                )}
                {staff.map((s) => (
                  <tr key={s.staffId}>
                    <td className="py-2.5 font-medium">{s.nome}</td>
                    <td className="py-2.5 text-right">{s.appuntamenti}</td>
                    <td className="py-2.5 text-right">{s.clientiUnici}</td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {formatCurrency(s.mediaCliente)}
                    </td>
                    <td className="py-2.5 text-right font-semibold">
                      {formatCurrency(s.fatturato)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">Fatturato per staff</h2>
            {chartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nessun dato.</p>
            ) : (
              <div className="mt-4">
                <RevenueChart
                  data={chartData}
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

      {/* Tabella ferie/presenze */}
      <section>
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">Ferie e presenze nel periodo</h2>
            <table className="mt-4 w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2 text-left font-medium">Staff</th>
                  <th className="pb-2 text-right font-medium">Giorni di ferie</th>
                  <th className="pb-2 text-right font-medium">Ore lavorate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teamHours.length === 0 && (
                  <EmptyTableRow
                    colSpan={3}
                    message="Nessun dato di ferie o presenze nel periodo."
                  />
                )}
                {teamHours.map((r) => (
                  <tr key={r.staffId}>
                    <td className="py-2.5 font-medium">{r.nome}</td>
                    <td className="py-2.5 text-right">{r.giorniFerie}</td>
                    <td className="py-2.5 text-right">
                      {r.oreLavorate.toLocaleString("it-IT", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                      h
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
