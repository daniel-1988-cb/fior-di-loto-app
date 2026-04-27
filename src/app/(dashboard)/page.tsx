export const dynamic = "force-dynamic";

import {
  Card,
  CardContent,
  Badge,
  Avatar,
  Button,
} from "@/components/ui";
import { Plus, Calendar as CalIcon, Euro, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import {
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
  const [fatturatoOggi, appOggi, topServizi, staffPerf, upcoming] = await Promise.all([
    getFatturatoOggi(),
    getAppuntamentiOggi(),
    getTopServizi(),
    getStaffPerformance(),
    getUpcomingAppointments().catch(() => []),
  ]);

  const oggi = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Primo appuntamento futuro nella lista upcoming
  const prossimo = appOggi.prossimo ?? (upcoming[0]
    ? {
        ora: upcoming[0].ora_inizio.slice(0, 5),
        cliente: `${upcoming[0].clients?.nome ?? ""} ${upcoming[0].clients?.cognome ?? ""}`.trim(),
        servizio: upcoming[0].services?.nome ?? "",
      }
    : null);

  return (
    <>
      {/* ── Hero section ── */}
      <section className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{oggi}</p>
            <h1 className="font-display text-4xl sm:text-5xl leading-tight text-foreground">
              Buongiorno, Laura
            </h1>
          </div>
          <Link href="/agenda/nuovo">
            <Button>
              <Plus className="h-4 w-4" /> Aggiungi
            </Button>
          </Link>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {/* Appuntamenti oggi */}
              <div className="px-6 py-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                  <CalIcon className="h-3.5 w-3.5" /> Oggi
                </p>
                <p className="font-display text-5xl text-foreground leading-none">
                  {appOggi.totali}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {appOggi.totali === 1 ? "appuntamento" : "appuntamenti"}
                </p>
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  {appOggi.completati > 0 && (
                    <Badge variant="success">{appOggi.completati} completati</Badge>
                  )}
                  {appOggi.cancellati > 0 && (
                    <Badge variant="danger">{appOggi.cancellati} annullati</Badge>
                  )}
                  {appOggi.noShow > 0 && (
                    <Badge variant="warning">{appOggi.noShow} no-show</Badge>
                  )}
                </div>
              </div>

              {/* Fatturato oggi */}
              <div className="px-6 py-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Euro className="h-3.5 w-3.5" /> Fatturato oggi
                </p>
                <p className="font-display text-5xl text-foreground leading-none">
                  {formatCurrency(fatturatoOggi.oggi)}
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <TrendBadge value={fatturatoOggi.trend} />
                  <span className="text-muted-foreground text-xs">
                    vs ieri {formatCurrency(fatturatoOggi.ieri)}
                  </span>
                </div>
              </div>

              {/* Prossimo appuntamento */}
              <div className="px-6 py-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Prossimo
                </p>
                {prossimo ? (
                  <>
                    <p className="font-display text-3xl text-foreground leading-none">
                      {prossimo.ora}
                    </p>
                    <p className="mt-1 text-sm font-medium truncate">{prossimo.cliente}</p>
                    <p className="text-xs text-muted-foreground truncate">{prossimo.servizio}</p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Nessun altro appuntamento oggi
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Feed secondario ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Prossimi appuntamenti — timeline compatta */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Prossimi in agenda
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Nessun appuntamento in programma.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {upcoming.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-md bg-muted text-[9px] font-semibold uppercase leading-tight">
                    <span>{new Date(a.data).toLocaleDateString("it-IT", { month: "short" })}</span>
                    <span className="text-sm leading-none">{new Date(a.data).getDate().toString().padStart(2, "0")}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {a.ora_inizio.slice(0, 5)} — {a.clients?.nome ?? ""} {a.clients?.cognome ?? ""}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{a.services?.nome ?? "Servizio"}</p>
                  </div>
                  <Badge
                    variant={
                      a.stato === "confermato" ? "success"
                      : a.stato === "completato" ? "primary"
                      : a.stato === "cancellato" ? "danger"
                      : "default"
                    }
                  >
                    {a.stato}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top servizi + staff — liste compatte */}
        <section className="space-y-6">
          {/* Top servizi */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Top servizi (mese)
            </h2>
            {topServizi.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Nessun dato disponibile.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {topServizi.slice(0, 5).map((s) => (
                  <li key={s.nome} className="flex items-center justify-between px-4 py-2.5 gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.nome}</p>
                      <p className="text-xs text-muted-foreground">{s.count} prenotazioni</p>
                    </div>
                    <span className="text-sm font-semibold shrink-0">{formatCurrency(s.fatturato)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Staff performance */}
          {staffPerf.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Team (mese)
              </h2>
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {staffPerf.slice(0, 4).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar name={`${s.nome} ${s.cognome ?? ""}`} size="sm" color={s.colore} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.nome} {s.cognome ?? ""}</p>
                      <p className="text-xs text-muted-foreground">{s.appuntamentiMese} app.</p>
                    </div>
                    <span className="text-sm font-semibold shrink-0">{formatCurrency(s.fatturato)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
