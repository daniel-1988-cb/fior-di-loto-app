export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, CardContent, Badge } from "@/components/ui";
import { ArrowDownRight, ArrowUpRight, Receipt, Gift, CalendarCheck, CreditCard, Minus } from "lucide-react";
import { getVenditeSummary } from "@/lib/actions/vendite";
import { formatCurrency } from "@/lib/utils";

export default async function VenditeHubPage() {
  const summary = await getVenditeSummary();
  const now = new Date();

  const deltaAbs = summary.entrate_mese - summary.entrate_mese_precedente;
  let deltaPct: number | null = null;
  if (summary.entrate_mese_precedente > 0) {
    deltaPct = Math.round((deltaAbs / summary.entrate_mese_precedente) * 100);
  } else if (summary.entrate_mese > 0) {
    deltaPct = 100;
  }

  const trendIcon =
    deltaPct === null ? (
      <Minus className="h-3.5 w-3.5" />
    ) : deltaPct >= 0 ? (
      <ArrowUpRight className="h-3.5 w-3.5" />
    ) : (
      <ArrowDownRight className="h-3.5 w-3.5" />
    );
  const trendColor =
    deltaPct === null
      ? "text-muted-foreground"
      : deltaPct >= 0
      ? "text-success"
      : "text-danger";

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Vendite</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Panoramica di {now.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Receipt className="h-4 w-4" />}
          label="Entrate del mese"
          value={formatCurrency(summary.entrate_mese)}
          footer={
            <span className={`inline-flex items-center gap-1 ${trendColor}`}>
              {trendIcon}
              {deltaPct === null
                ? "Nessuno storico"
                : `${deltaPct >= 0 ? "+" : ""}${deltaPct}% vs mese precedente`}
            </span>
          }
        />
        <SummaryCard
          icon={<CreditCard className="h-4 w-4" />}
          label="Transazioni del mese"
          value={String(summary.transazioni_count_mese)}
          footer={`Oggi ${formatCurrency(summary.entrate_oggi)} incassati`}
        />
        <SummaryCard
          icon={<Gift className="h-4 w-4" />}
          label="Voucher attivi"
          value={String(summary.voucher_attivi)}
          footer="Non ancora utilizzati"
        />
        <SummaryCard
          icon={<CalendarCheck className="h-4 w-4" />}
          label="Appuntamenti pagati"
          value={String(summary.appuntamenti_pagati_mese)}
          footer="Questo mese"
        />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Esplora</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <QuickLink
            href="/vendite/lista"
            title="Lista transazioni"
            desc="Filtra per periodo, metodo di pagamento, tipo. Esporta in CSV."
          />
          <QuickLink
            href="/vendite/voucher"
            title="Voucher emessi"
            desc="Codici venduti e riscattati, filtrabili per stato."
          />
          <QuickLink
            href="/vendite/appuntamenti"
            title="Appuntamenti pagati"
            desc="Sedute già incassate, collegate al calendario."
          />
          <QuickLink
            href="/vendite/pagamenti"
            title="Pagamenti"
            desc="Breakdown per metodo (disponibile in Fase 5 Reports)."
            muted
          />
          <QuickLink
            href="/vendite/ordini"
            title="Ordini prodotti"
            desc="In arrivo con Fase 2 Catalogo prodotti."
            muted
          />
          <QuickLink
            href="/vendite/abbonamenti"
            title="Abbonamenti venduti"
            desc="In arrivo con Fase 3 Clienti."
            muted
          />
        </div>
      </section>
    </>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  footer,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  footer: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-foreground">
            {icon}
          </span>
          <p className="text-xs uppercase tracking-wider">{label}</p>
        </div>
        <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
        <div className="mt-1 text-xs text-muted-foreground">{footer}</div>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  href,
  title,
  desc,
  muted,
}: {
  href: string;
  title: string;
  desc: string;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
        </div>
        {muted ? (
          <Badge variant="outline" className="shrink-0">
            prossima fase
          </Badge>
        ) : null}
      </div>
    </Link>
  );
}
