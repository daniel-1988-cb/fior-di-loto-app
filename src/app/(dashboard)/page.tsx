export const dynamic = "force-dynamic";

import { Users, CalendarDays, TrendingUp, UserPlus, Calendar, Euro, MessageCircle } from "lucide-react";
import Link from "next/link";
import { getDashboardStats } from "@/lib/actions/clients";
import { getDashboardChartData } from "@/lib/actions/dashboard";
import { formatCurrency } from "@/lib/utils";
import { VenditeChart, AppuntamentiChart } from "@/components/dashboard/charts";

export default async function DashboardPage() {
  const [stats, chartData] = await Promise.all([
    getDashboardStats(),
    getDashboardChartData(),
  ]);
  const percentuale = Math.min(Math.round((stats.entrateMese / 30000) * 100), 100);

  const kpis = [
    { label: "Totale Clienti", value: String(stats.totaleClienti), icon: Users, color: "bg-rose/10 text-rose", href: "/clienti" },
    { label: "Nuovi questo Mese", value: String(stats.nuoviMese), icon: UserPlus, color: "bg-gold/10 text-gold-dark", href: "/clienti" },
    { label: "Appuntamenti Oggi", value: String(stats.appuntamentiOggi), icon: CalendarDays, color: "bg-info/10 text-info", href: "/agenda" },
    { label: "Entrate Mese", value: formatCurrency(stats.entrateMese), icon: TrendingUp, color: "bg-success/10 text-success", href: "/gestionale" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Benvenuta in Fior di Loto Gestionale</p>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((stat) => (
          <Link key={stat.label} href={stat.href}
            className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-xl font-bold text-brown">{stat.value}</p>
              </div>
              <div className={`rounded-lg p-2.5 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VenditeChart data={chartData} />
        <AppuntamentiChart data={chartData} />
      </div>

      {/* Birthday Alerts */}
      {stats.compleanniSettimana.length > 0 && (
        <div className="mb-5 rounded-xl border border-gold/30 bg-gold/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-dark">
            🎂 Compleanni questa settimana
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.compleanniSettimana.map(c => (
              <Link key={c.id} href={`/clienti/${c.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-gold/20 bg-white px-3 py-1.5 text-sm hover:border-gold/50">
                <span className="font-medium text-brown">{c.nome} {c.cognome}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.data_nascita + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions + Obiettivo */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Quick actions */}
        <div className="lg:col-span-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Azioni rapide</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { href: "/agenda/nuovo", icon: Calendar, color: "text-rose", bg: "hover:bg-rose/5 hover:border-rose/30", label: "Nuovo Appuntamento" },
              { href: "/clienti/nuovo", icon: UserPlus, color: "text-gold", bg: "hover:bg-gold/5 hover:border-gold/30", label: "Nuova Cliente" },
              { href: "/gestionale/nuovo", icon: Euro, color: "text-success", bg: "hover:bg-success/5 hover:border-success/30", label: "Registra Incasso" },
              { href: "/whatsapp", icon: MessageCircle, color: "text-blue-500", bg: "hover:bg-blue-50 hover:border-blue-200", label: "Invia WhatsApp" },
            ].map((a) => (
              <Link key={a.href} href={a.href}
                className={`flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-colors ${a.bg}`}>
                <a.icon className={`h-5 w-5 ${a.color}`} />
                <span className="text-xs font-medium leading-tight text-brown">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Obiettivo mensile */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Obiettivo Mensile</p>
          <div className="mb-3 flex items-end justify-between">
            <span className="text-xl font-bold text-brown">{formatCurrency(stats.entrateMese)}</span>
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
