export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import { PeriodSelector } from "@/components/reports/period-selector";
import { parsePeriodoFromSearchParams } from "@/lib/reports/period";
import { RevenueChart, CHART_COLORS } from "@/components/reports/revenue-chart";
import {
  getStaffPerformance,
  getServicePerformance,
} from "@/lib/actions/reports";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

// ============================================
// /reports/rendimento — Fase 5
//
// PeriodSelector + "tabs" (via query param ?tab=) per staff / servizio /
// categoria. Ogni tab: tabella + mini bar chart.
// ============================================

type Tab = "staff" | "servizio" | "categoria";

function parseTab(sp: Record<string, string | string[] | undefined>): Tab {
  const raw = sp?.tab;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "servizio" || v === "categoria" || v === "staff") return v;
  return "staff";
}

function tabUrl(base: URLSearchParams, tab: Tab): string {
  const p = new URLSearchParams(base.toString());
  p.set("tab", tab);
  return `?${p.toString()}`;
}

export default async function RendimentoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const periodo = parsePeriodoFromSearchParams(sp);
  const tab = parseTab(sp);

  const [staff, servizi] = await Promise.all([
    getStaffPerformance(periodo),
    getServicePerformance(periodo),
  ]);

  // Build URLSearchParams from current sp for tab links
  const currentParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") currentParams.set(k, v);
    else if (Array.isArray(v) && v[0]) currentParams.set(k, v[0]);
  }

  // Aggregate per-categoria from servizi rows
  const categoriaMap = new Map<
    string,
    { categoria: string; count: number; fatturato: number }
  >();
  for (const s of servizi) {
    const key = s.categoria || "—";
    if (!categoriaMap.has(key)) {
      categoriaMap.set(key, { categoria: key, count: 0, fatturato: 0 });
    }
    const e = categoriaMap.get(key)!;
    e.count += s.count;
    e.fatturato += s.fatturato;
  }
  const categorie = Array.from(categoriaMap.values()).sort(
    (a, b) => b.fatturato - a.fatturato,
  );

  return (
    <>
      <header className="mb-6">
        <Link
          href="/reports"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Reports
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard del rendimento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Breakdown fatturato e appuntamenti completati per staff, servizio o categoria.
        </p>
      </header>

      <div className="mb-6">
        <PeriodSelector />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-2">
        <TabLink label="Per staff" active={tab === "staff"} href={tabUrl(currentParams, "staff")} />
        <TabLink
          label="Per servizio"
          active={tab === "servizio"}
          href={tabUrl(currentParams, "servizio")}
        />
        <TabLink
          label="Per categoria"
          active={tab === "categoria"}
          href={tabUrl(currentParams, "categoria")}
        />
      </div>

      {tab === "staff" && (
        <StaffView staff={staff} />
      )}
      {tab === "servizio" && (
        <ServiziView servizi={servizi} />
      )}
      {tab === "categoria" && (
        <CategorieView categorie={categorie} />
      )}
    </>
  );
}

function TabLink({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function StaffView({
  staff,
}: {
  staff: Array<{
    staffId: string;
    nome: string;
    appuntamenti: number;
    fatturato: number;
    clientiUnici: number;
    mediaCliente: number;
  }>;
}) {
  const chartData = staff
    .slice(0, 10)
    .map((s) => ({ label: s.nome, fatturato: Math.round(s.fatturato) }));
  return (
    <section className="grid gap-4 md:grid-cols-5">
      <Card className="md:col-span-3">
        <CardContent className="pt-6">
          <h2 className="text-base font-semibold">Dettaglio staff</h2>
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="pb-2 text-left font-medium">Staff</th>
                <th className="pb-2 text-right font-medium">Appt</th>
                <th className="pb-2 text-right font-medium">Clienti</th>
                <th className="pb-2 text-right font-medium">Media/cliente</th>
                <th className="pb-2 text-right font-medium">Fatturato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                    Nessun appuntamento completato nel periodo.
                  </td>
                </tr>
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
                series={[{ dataKey: "fatturato", label: "Fatturato", color: CHART_COLORS.primary }]}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function ServiziView({
  servizi,
}: {
  servizi: Array<{
    serviceId: string;
    nome: string;
    categoria: string;
    count: number;
    fatturato: number;
    mediaPrezzo: number;
  }>;
}) {
  const chartData = servizi
    .slice(0, 10)
    .map((s) => ({ label: s.nome, fatturato: Math.round(s.fatturato) }));
  return (
    <section className="grid gap-4 md:grid-cols-5">
      <Card className="md:col-span-3">
        <CardContent className="pt-6">
          <h2 className="text-base font-semibold">Dettaglio servizi</h2>
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="pb-2 text-left font-medium">Servizio</th>
                <th className="pb-2 text-right font-medium">Appt</th>
                <th className="pb-2 text-right font-medium">Media</th>
                <th className="pb-2 text-right font-medium">Fatturato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {servizi.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                    Nessun servizio nel periodo.
                  </td>
                </tr>
              )}
              {servizi.map((s) => (
                <tr key={s.serviceId}>
                  <td className="py-2.5">
                    <div className="font-medium">{s.nome}</div>
                    <div className="text-xs text-muted-foreground">{s.categoria}</div>
                  </td>
                  <td className="py-2.5 text-right">{s.count}</td>
                  <td className="py-2.5 text-right text-muted-foreground">
                    {formatCurrency(s.mediaPrezzo)}
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
          <h2 className="text-base font-semibold">Top 10 per fatturato</h2>
          {chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nessun dato.</p>
          ) : (
            <div className="mt-4">
              <RevenueChart
                data={chartData}
                variant="bar"
                unit="eur"
                height={260}
                series={[{ dataKey: "fatturato", label: "Fatturato", color: CHART_COLORS.rose }]}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function CategorieView({
  categorie,
}: {
  categorie: Array<{ categoria: string; count: number; fatturato: number }>;
}) {
  const chartData = categorie.map((c) => ({
    label: c.categoria,
    fatturato: Math.round(c.fatturato),
  }));
  return (
    <section className="grid gap-4 md:grid-cols-5">
      <Card className="md:col-span-3">
        <CardContent className="pt-6">
          <h2 className="text-base font-semibold">Dettaglio categorie</h2>
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="pb-2 text-left font-medium">Categoria</th>
                <th className="pb-2 text-right font-medium">Appt</th>
                <th className="pb-2 text-right font-medium">Fatturato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categorie.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-muted-foreground">
                    Nessuna categoria nel periodo.
                  </td>
                </tr>
              )}
              {categorie.map((c) => (
                <tr key={c.categoria}>
                  <td className="py-2.5 font-medium capitalize">{c.categoria}</td>
                  <td className="py-2.5 text-right">{c.count}</td>
                  <td className="py-2.5 text-right font-semibold">
                    {formatCurrency(c.fatturato)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardContent className="pt-6">
          <h2 className="text-base font-semibold">Fatturato per categoria</h2>
          {chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nessun dato.</p>
          ) : (
            <div className="mt-4">
              <RevenueChart
                data={chartData}
                variant="bar"
                unit="eur"
                height={260}
                series={[{ dataKey: "fatturato", label: "Fatturato", color: CHART_COLORS.info }]}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
