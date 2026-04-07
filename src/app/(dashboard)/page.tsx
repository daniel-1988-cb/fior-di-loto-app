export const dynamic = "force-dynamic";

import {
  Users,
  CalendarDays,
  TrendingUp,
  UserPlus,
  Calendar,
  Euro,
  MessageCircle,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle2,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { getDashboardStats } from "@/lib/actions/clients";
import {
  getDashboardChartData,
  getFatturatoOggi,
  getAppuntamentiOggi,
  getCompleanni,
  getTopServizi,
  getStaffPerformance,
} from "@/lib/actions/dashboard";
import { formatCurrency } from "@/lib/utils";
import { VenditeChart, AppuntamentiChart } from "@/components/dashboard/charts";

export default async function DashboardPage() {
  const [stats, chartData, fatturatoOggi, appOggi, compleanni, topServizi, staffPerf] =
    await Promise.all([
      getDashboardStats(),
      getDashboardChartData(),
      getFatturatoOggi(),
      getAppuntamentiOggi(),
      getCompleanni(),
      getTopServizi(),
      getStaffPerformance(),
    ]);

  const percentuale = Math.min(Math.round((stats.entrateMese / 30000) * 100), 100);
  const noShowPct =
    appOggi.totali > 0 ? Math.round((appOggi.noShow / appOggi.totali) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Benvenuta in Fior di Loto Gestionale
        </p>
      </div>

      {/* === KPI LIVE CARDS === */}
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {/* Fatturato Oggi */}
        <Link
          href="/gestionale"
          className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Fatturato Oggi
              </p>
              <p className="mt-1.5 text-2xl font-bold text-brown">
                {formatCurrency(fatturatoOggi.oggi)}
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                {fatturatoOggi.trend >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                )}
                <span
                  className={`text-xs font-semibold ${
                    fatturatoOggi.trend >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {fatturatoOggi.trend >= 0 ? "+" : ""}
                  {fatturatoOggi.trend}%
                </span>
                <span className="text-xs text-muted-foreground">vs ieri</span>
              </div>
            </div>
            <div className="rounded-lg bg-success/10 p-2.5 text-success">
              <Euro className="h-5 w-5" />
            </div>
          </div>
        </Link>

        {/* Appuntamenti Oggi */}
        <Link
          href="/agenda"
          className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Appuntamenti Oggi
              </p>
              <p className="mt-1.5 text-2xl font-bold text-brown">{appOggi.totali}</p>
              <div className="mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <span className="text-xs font-semibold text-success">
                  {appOggi.completati} completati
                </span>
                <span className="text-xs text-muted-foreground">
                  / {appOggi.totali}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-info/10 p-2.5 text-info">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
        </Link>

        {/* No-show */}
        <Link
          href="/agenda"
          className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                No-show Oggi
              </p>
              <p className="mt-1.5 text-2xl font-bold text-brown">{appOggi.noShow}</p>
              <div className="mt-1.5 flex items-center gap-1">
                <AlertCircle
                  className={`h-3.5 w-3.5 ${appOggi.noShow > 0 ? "text-amber-500" : "text-muted-foreground"}`}
                />
                <span
                  className={`text-xs font-semibold ${appOggi.noShow > 0 ? "text-amber-500" : "text-muted-foreground"}`}
                >
                  {noShowPct}%
                </span>
                <span className="text-xs text-muted-foreground">del totale</span>
              </div>
            </div>
            <div className="rounded-lg bg-amber-100 p-2.5 text-amber-500">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
        </Link>

        {/* Prossimo Appuntamento */}
        <Link
          href="/agenda"
          className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Prossimo
              </p>
              {appOggi.prossimo ? (
                <>
                  <p className="mt-1.5 text-2xl font-bold text-brown">
                    {appOggi.prossimo.ora}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-brown/80">
                    {appOggi.prossimo.cliente}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {appOggi.prossimo.servizio}
                  </p>
                </>
              ) : (
                <p className="mt-1.5 text-sm text-muted-foreground">Nessuno</p>
              )}
            </div>
            <div className="rounded-lg bg-rose/10 p-2.5 text-rose">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </Link>
      </div>

      {/* === COMPLEANNI === */}
      {(compleanni.oggi.length > 0 || compleanni.prossimi7giorni.length > 0) && (
        <div className="mb-6 rounded-xl border border-gold/30 bg-gold/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-dark">
            🎂 Compleanni
          </h3>

          {/* Oggi */}
          {compleanni.oggi.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold-dark/70">
                Oggi
              </p>
              <div className="flex flex-wrap gap-2">
                {compleanni.oggi.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg border border-gold/30 bg-white px-3 py-2"
                  >
                    <Link
                      href={`/clienti/${c.id}`}
                      className="text-sm font-semibold text-brown hover:underline"
                    >
                      {c.nome} {c.cognome}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.data_nascita + "T00:00:00").toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    {c.telefono && (
                      <a
                        href={`https://wa.me/${c.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Ciao ${c.nome}! Tanti auguri di buon compleanno da tutto il team di Fior di Loto! 🎂🌸`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-green-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-green-600"
                      >
                        <Phone className="h-3 w-3" />
                        WA
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prossimi 7 giorni */}
          {compleanni.prossimi7giorni.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold-dark/70">
                Prossimi 7 giorni
              </p>
              <div className="flex flex-wrap gap-2">
                {compleanni.prossimi7giorni.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg border border-gold/20 bg-white px-3 py-1.5"
                  >
                    <Link
                      href={`/clienti/${c.id}`}
                      className="text-sm font-medium text-brown hover:underline"
                    >
                      {c.nome} {c.cognome}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.data_nascita + "T00:00:00").toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    {c.telefono && (
                      <a
                        href={`https://wa.me/${c.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Ciao ${c.nome}! Tra poco è il tuo compleanno e volevamo augurarti in anticipo tutto il meglio da Fior di Loto! 🌸`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100"
                      >
                        <Phone className="h-3 w-3" />
                        WA
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === CHARTS === */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VenditeChart data={chartData} />
        <AppuntamentiChart data={chartData} />
      </div>

      {/* === STAFF PERFORMANCE + TOP SERVIZI === */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Staff Performance */}
        {staffPerf.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Performance Staff — Questo Mese
            </p>
            <div className="space-y-3">
              {staffPerf.map((s) => (
                <div key={s.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: s.colore }}
                      />
                      <span className="text-sm font-medium text-brown">
                        {s.nome} {s.cognome}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({s.appuntamentiMese} apts)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-brown">
                        {formatCurrency(s.fatturato)}
                      </span>
                      {s.obiettivo > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          / {formatCurrency(s.obiettivo)}
                        </span>
                      )}
                    </div>
                  </div>
                  {s.obiettivo > 0 && (
                    <div className="h-2 overflow-hidden rounded-full bg-cream-dark">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose to-gold transition-all duration-700"
                        style={{ width: `${s.percentuale}%` }}
                      />
                    </div>
                  )}
                  {s.obiettivo > 0 && (
                    <p className="mt-0.5 text-right text-xs text-muted-foreground">
                      {s.percentuale}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Servizi */}
        {topServizi.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Top Servizi — Questo Mese
            </p>
            <div className="space-y-3">
              {topServizi.map((s, i) => (
                <div key={s.nome} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose/10 text-xs font-bold text-rose">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-brown">{s.nome}</span>
                      <span className="shrink-0 text-sm font-semibold text-brown">
                        {formatCurrency(s.fatturato)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs capitalize text-muted-foreground">
                        {s.categoria}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {s.count} {s.count === 1 ? "trattamento" : "trattamenti"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* === QUICK ACTIONS + OBIETTIVO === */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Azioni Rapide
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                href: "/agenda/nuovo",
                icon: Calendar,
                color: "text-rose",
                bg: "hover:bg-rose/5 hover:border-rose/30",
                label: "Nuovo Appuntamento",
              },
              {
                href: "/clienti/nuovo",
                icon: UserPlus,
                color: "text-gold",
                bg: "hover:bg-gold/5 hover:border-gold/30",
                label: "Nuova Cliente",
              },
              {
                href: "/gestionale/nuovo",
                icon: Euro,
                color: "text-success",
                bg: "hover:bg-success/5 hover:border-success/30",
                label: "Registra Incasso",
              },
              {
                href: "/whatsapp",
                icon: MessageCircle,
                color: "text-blue-500",
                bg: "hover:bg-blue-50 hover:border-blue-200",
                label: "Invia WhatsApp",
              },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-colors ${a.bg}`}
              >
                <a.icon className={`h-5 w-5 ${a.color}`} />
                <span className="text-xs font-medium leading-tight text-brown">{a.label}</span>
              </Link>
            ))}
          </div>

          {/* KPI secondari in riga */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link href="/clienti" className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Totale Clienti</p>
                  <p className="mt-1 text-xl font-bold text-brown">{stats.totaleClienti}</p>
                </div>
                <div className="rounded-lg bg-rose/10 p-2 text-rose">
                  <Users className="h-4 w-4" />
                </div>
              </div>
            </Link>
            <Link href="/clienti" className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Nuove questo Mese</p>
                  <p className="mt-1 text-xl font-bold text-brown">{stats.nuoviMese}</p>
                </div>
                <div className="rounded-lg bg-gold/10 p-2 text-gold-dark">
                  <UserPlus className="h-4 w-4" />
                </div>
              </div>
            </Link>
            <Link href="/gestionale" className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Entrate Mese</p>
                  <p className="mt-1 text-xl font-bold text-brown">{formatCurrency(stats.entrateMese)}</p>
                </div>
                <div className="rounded-lg bg-success/10 p-2 text-success">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
            </Link>
            <Link href="/agenda" className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Cancellati Oggi</p>
                  <p className="mt-1 text-xl font-bold text-brown">{appOggi.cancellati}</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
                  <CalendarDays className="h-4 w-4" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Obiettivo Mensile */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Obiettivo Mensile
          </p>
          <div className="mb-3 flex items-end justify-between">
            <span className="text-xl font-bold text-brown">
              {formatCurrency(stats.entrateMese)}
            </span>
            <span className="text-sm text-muted-foreground">/ {formatCurrency(30000)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-cream-dark">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose to-gold transition-all duration-700"
              style={{ width: `${percentuale}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{percentuale}% raggiunto</p>
        </div>
      </div>
    </div>
  );
}
