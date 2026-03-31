export const dynamic = "force-dynamic";

import { Users, CalendarDays, TrendingUp, UserPlus, Calendar, Euro, MessageCircle } from "lucide-react";
import Link from "next/link";
import { getDashboardStats } from "@/lib/actions/clients";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const percentuale = Math.min(Math.round((stats.entrateMese / 30000) * 100), 100);

  const kpis = [
    {
      label: "Totale Clienti",
      value: String(stats.totaleClienti),
      icon: Users,
      color: "bg-rose/10 text-rose",
      href: "/clienti",
    },
    {
      label: "Nuovi questo Mese",
      value: String(stats.nuoviMese),
      icon: UserPlus,
      color: "bg-gold/10 text-gold-dark",
      href: "/clienti",
    },
    {
      label: "Appuntamenti Oggi",
      value: String(stats.appuntamentiOggi),
      icon: CalendarDays,
      color: "bg-info/10 text-info",
      href: "/agenda",
    },
    {
      label: "Entrate Mese",
      value: formatCurrency(stats.entrateMese),
      icon: TrendingUp,
      color: "bg-success/10 text-success",
      href: "/gestionale",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Benvenuta in Fior di Loto Gestionale
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-brown">
                  {stat.value}
                </p>
              </div>
              <div className={`rounded-lg p-3 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Birthday Alerts */}
      {stats.compleanniSettimana.length > 0 && (
        <div className="mb-6 rounded-xl border border-gold/30 bg-gold/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-dark">
            🎂 Compleanni questa settimana
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.compleanniSettimana.map(c => (
              <Link key={c.id} href={`/clienti/${c.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-white border border-gold/20 px-3 py-1.5 text-sm hover:border-gold/50">
                <span className="font-medium text-brown">{c.nome} {c.cognome}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.data_nascita + 'T00:00:00').toLocaleDateString('it-IT', {day: 'numeric', month: 'short'})}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/agenda/nuovo" className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center hover:border-rose/30 hover:bg-rose/5">
          <Calendar className="h-6 w-6 text-rose" />
          <span className="text-xs font-medium text-brown">Nuovo<br/>Appuntamento</span>
        </Link>
        <Link href="/clienti/nuovo" className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center hover:border-rose/30 hover:bg-rose/5">
          <UserPlus className="h-6 w-6 text-gold" />
          <span className="text-xs font-medium text-brown">Nuova<br/>Cliente</span>
        </Link>
        <Link href="/gestionale/nuovo" className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center hover:border-rose/30 hover:bg-rose/5">
          <Euro className="h-6 w-6 text-success" />
          <span className="text-xs font-medium text-brown">Registra<br/>Incasso</span>
        </Link>
        <Link href="/whatsapp" className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center hover:border-rose/30 hover:bg-rose/5">
          <MessageCircle className="h-6 w-6 text-blue-500" />
          <span className="text-xs font-medium text-brown">Invia<br/>WhatsApp</span>
        </Link>
      </div>

      {/* Obiettivo Mensile */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-brown">Obiettivo Mensile</h2>
          <span className="text-sm text-muted-foreground">
            {formatCurrency(stats.entrateMese)} / {formatCurrency(30000)}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-cream-dark">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose to-gold transition-all duration-500"
            style={{ width: `${percentuale}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {percentuale}% dell&apos;obiettivo raggiunto
        </p>
      </div>

      {/* CTA */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-brown">
          Inizia subito
        </h2>
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Hai {stats.totaleClienti} clienti nel sistema. Gestiscili dalla sezione Clienti.
          </p>
          <Link
            href="/clienti"
            className="mt-4 rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:bg-rose-dark"
          >
            Vai ai Clienti
          </Link>
        </div>
      </div>
    </div>
  );
}
