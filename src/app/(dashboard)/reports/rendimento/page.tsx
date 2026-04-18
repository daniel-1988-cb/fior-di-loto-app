export const dynamic = "force-dynamic";

import { reportsSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Badge, Avatar } from "@/components/ui";
import { SalesLineChart, AppointmentsBarChart } from "@/components/v2/dashboard-charts";
import {
  getDashboardChartData,
  getTopServizi,
  getStaffPerformance,
} from "@/lib/actions/dashboard";
import { getFinancialSummary } from "@/lib/actions/transactions";
import { formatCurrency } from "@/lib/utils";

export default async function V2ReportRendimentoPage() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [chart, topServizi, staffPerf, summary] = await Promise.all([
    getDashboardChartData(),
    getTopServizi(),
    getStaffPerformance(),
    getFinancialSummary(month),
  ]);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard del rendimento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fatturato, appuntamenti e team nel mese corrente.
        </p>
      </header>

      <section className="mb-6 grid gap-3 md:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Entrate mese</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(summary.entrate)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Uscite mese</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(summary.uscite)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Saldo</p>
          <p className="mt-1 text-2xl font-bold">
            {formatCurrency((summary.entrate ?? 0) - (summary.uscite ?? 0))}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Appuntamenti 7g</p>
          <p className="mt-1 text-2xl font-bold">
            {chart.reduce((s, d) => s + d.appuntamenti, 0)}
          </p>
        </Card>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">Vendite ultimi 7 giorni</h2>
            <div className="mt-4">
              <SalesLineChart data={chart} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">Appuntamenti</h2>
            <div className="mt-4">
              <AppointmentsBarChart data={chart} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">Top servizi</h2>
            <table className="mt-4 w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2 text-left font-medium">Servizio</th>
                  <th className="pb-2 text-right font-medium">Prenotazioni</th>
                  <th className="pb-2 text-right font-medium">Fatturato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topServizi.slice(0, 8).map((s) => (
                  <tr key={s.nome}>
                    <td className="py-2.5">
                      <div className="font-medium">{s.nome}</div>
                      <div className="text-xs text-muted-foreground">{s.categoria}</div>
                    </td>
                    <td className="py-2.5 text-right">{s.count}</td>
                    <td className="py-2.5 text-right font-semibold">
                      {formatCurrency(s.fatturato)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">Performance team</h2>
            <ul className="mt-4 space-y-3">
              {staffPerf.map((s) => {
                const pct = Math.min(Math.round((s.fatturato / (s.obiettivo || 1)) * 100), 100);
                return (
                  <li key={s.id}>
                    <div className="flex items-center gap-3">
                      <Avatar name={`${s.nome} ${s.cognome ?? ""}`} size="sm" color={s.colore} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {s.nome} {s.cognome ?? ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.appuntamentiMese} appuntamenti
                        </p>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(s.fatturato)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <Badge variant="outline">Aggiornato in tempo reale</Badge>
      </section>
    </>
  );
}
