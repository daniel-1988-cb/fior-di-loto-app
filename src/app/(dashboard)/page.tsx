export const dynamic = "force-dynamic";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Avatar,
  Button,
} from "@/components/ui";
import { Plus, TrendingUp, TrendingDown, Calendar as CalIcon, Euro } from "lucide-react";
import Link from "next/link";
import { SalesLineChart, AppointmentsBarChart } from "@/components/v2/dashboard-charts";
import {
  getDashboardChartData,
  getFatturatoOggi,
  getAppuntamentiOggi,
  getTopServizi,
  getStaffPerformance,
} from "@/lib/actions/dashboard";
import { getUpcomingAppointments } from "@/lib/actions/appointments";
import { formatCurrency } from "@/lib/utils";

function TrendBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        positive ? "text-success" : "text-danger"
      }`}
    >
      {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {positive ? "+" : ""}
      {value}%
    </span>
  );
}

export default async function V2DashboardPage() {
  const [chartData, fatturatoOggi, appOggi, topServizi, staffPerf, upcoming] = await Promise.all([
    getDashboardChartData(),
    getFatturatoOggi(),
    getAppuntamentiOggi(),
    getTopServizi(),
    getStaffPerformance(),
    getUpcomingAppointments().catch(() => []),
  ]);

  const totaleVendite = chartData.reduce((s, d) => s + d.vendite, 0);
  const totaleAppuntamenti = chartData.reduce((s, d) => s + d.appuntamenti, 0);
  const valoreMedio = totaleAppuntamenti > 0 ? totaleVendite / totaleAppuntamenti : 0;

  return (
    <>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date().toLocaleDateString("it-IT", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Link href="/agenda/nuovo">
          <Button>
            <Plus className="h-4 w-4" /> Aggiungi
          </Button>
        </Link>
      </header>

      {/* Top stats row */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendite recenti</CardTitle>
            <CardDescription>Ultimi 7 giorni</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <p className="text-4xl font-bold tracking-tight">
                {formatCurrency(totaleVendite)}
              </p>
              <TrendBadge value={fatturatoOggi.trend ?? 0} />
            </div>
            <div className="mt-4 flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Appuntamenti </span>
                <span className="font-semibold">{totaleAppuntamenti}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Valore medio </span>
                <span className="font-semibold">{formatCurrency(valoreMedio)}</span>
              </div>
            </div>
            <div className="mt-6">
              <SalesLineChart data={chartData} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prossimi appuntamenti</CardTitle>
            <CardDescription>Prossimi 7 giorni</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <p className="text-4xl font-bold tracking-tight">{totaleAppuntamenti}</p>
              <span className="text-xs text-muted-foreground">
                {appOggi.totali} oggi
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <Badge variant="success">{appOggi.completati} completati</Badge>
              {appOggi.cancellati > 0 && (
                <Badge variant="danger">{appOggi.cancellati} annullati</Badge>
              )}
              {appOggi.noShow > 0 && (
                <Badge variant="warning">{appOggi.noShow} no-show</Badge>
              )}
            </div>
            <div className="mt-6">
              <AppointmentsBarChart data={chartData} />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Attività + feed */}
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attività appuntamenti</CardTitle>
            <CardDescription>Prossimi in agenda</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {upcoming.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nessun appuntamento in programma.</p>
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-start gap-3 py-3">
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-muted text-[10px] font-semibold uppercase">
                      <span>
                        {new Date(a.data).toLocaleDateString("it-IT", { month: "short" })}
                      </span>
                      <span className="text-sm">
                        {new Date(a.data).getDate().toString().padStart(2, "0")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{a.ora_inizio.slice(0, 5)}</span>
                        <Badge
                          variant={
                            a.stato === "confermato"
                              ? "success"
                              : a.stato === "completato"
                              ? "primary"
                              : a.stato === "cancellato"
                              ? "danger"
                              : "default"
                          }
                        >
                          {a.stato}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-sm">
                        {a.services?.nome ?? "Servizio"} — {a.clients?.nome ?? ""}{" "}
                        {a.clients?.cognome ?? ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fatturato oggi</CardTitle>
            <CardDescription>Confronto con ieri</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Euro className="h-6 w-6" />
              </div>
              <div>
                <p className="text-3xl font-bold">{formatCurrency(fatturatoOggi.oggi)}</p>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <TrendBadge value={fatturatoOggi.trend} />
                  <span className="text-muted-foreground">
                    ieri {formatCurrency(fatturatoOggi.ieri)}
                  </span>
                </div>
              </div>
            </div>
            {appOggi.prossimo && (
              <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                  <CalIcon className="h-3.5 w-3.5" /> Prossimo appuntamento
                </div>
                <p className="mt-1 text-sm font-medium">
                  {appOggi.prossimo.ora} — {appOggi.prossimo.cliente}
                </p>
                <p className="text-xs text-muted-foreground">{appOggi.prossimo.servizio}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Top servizi + staff */}
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">I servizi migliori</CardTitle>
            <CardDescription>Performance ultimo mese</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {topServizi.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nessun dato disponibile.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="pb-2 text-left font-medium">Servizio</th>
                    <th className="pb-2 text-right font-medium">Prenotazioni</th>
                    <th className="pb-2 text-right font-medium">Fatturato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topServizi.slice(0, 6).map((s) => (
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Miglior membro del team</CardTitle>
            <CardDescription>Fatturato mese corrente</CardDescription>
          </CardHeader>
          <CardContent>
            {staffPerf.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nessun dato disponibile.</p>
            ) : (
              <ul className="space-y-3">
                {staffPerf.slice(0, 6).map((s) => {
                  const target = s.obiettivo || 1;
                  const pct = Math.min(Math.round((s.fatturato / target) * 100), 100);
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
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
