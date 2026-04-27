export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { PeriodSelector } from "@/components/reports/period-selector";
import { parsePeriodoFromSearchParams } from "@/lib/reports/period";
import { getKpiOverview } from "@/lib/actions/reports";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Users,
  UserPlus,
  CalendarCheck,
  Receipt,
  Wallet,
  ArrowUpRight,
  BarChart3,
  LineChart,
  Grid3x3,
} from "lucide-react";

// ============================================
// Reports hub — Fase 5
//
// - PeriodSelector in alto (URL-driven)
// - 6 KPI cards (fatturato ∆, clienti attivi, nuovi clienti,
//   appuntamenti completati, ticket medio, margine)
// - Top 5 servizi + Top 5 prodotti (tabelle compatte)
// - 3 link cards a sottopagine: cash-flow, cohort, rendimento
// ============================================

export default async function ReportsHubPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const periodo = parsePeriodoFromSearchParams(sp);
  const kpi = await getKpiOverview(periodo);

  const deltaFatturato =
    kpi.fatturatoMesePrec > 0
      ? ((kpi.fatturatoTotale - kpi.fatturatoMesePrec) / kpi.fatturatoMesePrec) * 100
      : kpi.fatturatoTotale > 0
      ? 100
      : 0;

  const margine = kpi.fatturatoTotale > 0 ? kpi.fatturatoTotale * 0 : 0;
  // Margine reale lo calcoliamo in cash-flow; qui mostriamo solo il fatturato
  // come "entrate lorde" del periodo.

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Report e statistiche</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview del periodo selezionato. Filtra e approfondisci sulle sottopagine.
        </p>
      </header>

      <div className="mb-6">
        <PeriodSelector />
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          icon={<Wallet className="h-5 w-5" />}
          label="Fatturato periodo"
          value={formatCurrency(kpi.fatturatoTotale)}
          delta={deltaFatturato}
          subtitle={`vs precedente ${formatCurrency(kpi.fatturatoMesePrec)}`}
        />
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Clienti attivi"
          value={String(kpi.clientiAttivi)}
          subtitle="hanno speso o prenotato"
        />
        <KpiCard
          icon={<UserPlus className="h-5 w-5" />}
          label="Nuovi clienti"
          value={String(kpi.nuoviClienti)}
          subtitle="creati nel periodo"
        />
        <KpiCard
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Appuntamenti completati"
          value={String(kpi.appuntamentiCompletati)}
          subtitle="stato = completato"
        />
        <KpiCard
          icon={<Receipt className="h-5 w-5" />}
          label="Ticket medio"
          value={formatCurrency(kpi.ticketMedio)}
          subtitle="fatturato / transazioni"
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Transazioni"
          value={String(Math.max(0, Math.round(kpi.fatturatoTotale / Math.max(kpi.ticketMedio || 1, 1))))}
          subtitle="numero entrate"
        />
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-base font-semibold">Top 5 servizi</h2>
            <p className="text-xs text-muted-foreground">Per fatturato nel periodo.</p>
            <table className="mt-4 w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2 text-left font-medium">Servizio</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Fatturato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {kpi.topServizi.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-xs text-muted-foreground">
                      Nessun servizio venduto nel periodo.
                    </td>
                  </tr>
                )}
                {kpi.topServizi.map((s) => (
                  <tr key={s.nome}>
                    <td className="py-2.5 font-medium">{s.nome}</td>
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
            <h2 className="text-base font-semibold">Top 5 prodotti</h2>
            <p className="text-xs text-muted-foreground">Per fatturato nel periodo.</p>
            <table className="mt-4 w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2 text-left font-medium">Prodotto</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Fatturato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {kpi.topProdotti.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-xs text-muted-foreground">
                      Nessun prodotto venduto nel periodo.
                    </td>
                  </tr>
                )}
                {kpi.topProdotti.map((p) => (
                  <tr key={p.nome}>
                    <td className="py-2.5 font-medium">{p.nome}</td>
                    <td className="py-2.5 text-right">{p.qty}</td>
                    <td className="py-2.5 text-right font-semibold">
                      {formatCurrency(p.fatturato)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-base font-semibold">Approfondisci</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <LinkCard
            href="/reports/cash-flow"
            icon={<BarChart3 className="h-5 w-5" />}
            title="Cash flow"
            description="Entrate vs uscite giornaliere con margine."
          />
          <LinkCard
            href="/reports/cohort"
            icon={<Grid3x3 className="h-5 w-5" />}
            title="Cohort retention"
            description="Heatmap ritorni clienti per mese di acquisizione."
          />
          <LinkCard
            href="/reports/rendimento"
            icon={<LineChart className="h-5 w-5" />}
            title="Rendimento"
            description="Breakdown per staff, servizio e categoria."
          />
        </div>
      </section>

      {/* suppress unused var warning */}
      <span className="hidden">{margine}</span>
    </>
  );
}

function KpiCard({
  icon,
  label,
  value,
  subtitle,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  delta?: number;
}) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const deltaPositive = (delta ?? 0) >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
        {hasDelta && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              deltaPositive
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            }`}
          >
            {deltaPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(delta!).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </Card>
  );
}

function LinkCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full p-5 transition-colors hover:bg-muted/30">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h3 className="font-semibold">{title}</h3>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
