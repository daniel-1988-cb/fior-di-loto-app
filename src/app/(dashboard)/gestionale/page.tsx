export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus, TrendingUp, TrendingDown, Wallet, Target } from "lucide-react";
import { getFinancialSummary, getTransactions } from "@/lib/actions/transactions";
import { formatCurrency, formatDate } from "@/lib/utils";

type Transaction = {
  id: string;
  tipo: string;
  categoria: string;
  descrizione: string;
  importo: number;
  metodo_pagamento: string | null;
  data: string;
  client_nome: string | null;
  client_cognome: string | null;
};

function getMetodoLabel(metodo: string | null) {
  switch (metodo) {
    case "contanti": return "Contanti";
    case "carta": return "Carta";
    case "bonifico": return "Bonifico";
    case "satispay": return "Satispay";
    default: return metodo || "—";
  }
}

export default async function GestionalePage() {
  const [summary, transactions] = await Promise.all([
    getFinancialSummary(),
    getTransactions(),
  ]);

  const recentTransactions = (transactions as unknown as Transaction[]).slice(0, 20);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
            Gestionale
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Riepilogo finanziario del mese corrente</p>
        </div>
        <Link
          href="/gestionale/nuovo"
          className="inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-dark"
        >
          <Plus className="h-4 w-4" />
          Nuova Transazione
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Entrate Mese</p>
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <p className="mt-2 text-2xl font-bold text-brown">
            {formatCurrency(summary.entrate)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Uscite Mese</p>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-brown">
            {formatCurrency(summary.uscite)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Profitto Netto</p>
            <Wallet className="h-5 w-5 text-gold" />
          </div>
          <p className={`mt-2 text-2xl font-bold ${summary.profitto >= 0 ? "text-success" : "text-red-500"}`}>
            {formatCurrency(summary.profitto)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Obiettivo Mensile</p>
            <Target className="h-5 w-5 text-rose" />
          </div>
          <p className="mt-2 text-2xl font-bold text-brown">
            {summary.progressoPercentuale}%
          </p>
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-cream-dark">
              <div
                className="h-full rounded-full bg-rose transition-all"
                style={{ width: `${summary.progressoPercentuale}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(summary.entrate)} / {formatCurrency(summary.obiettivo)}
            </p>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-brown">Transazioni Recenti</h2>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nessuna transazione questo mese
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-cream-dark/50">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Data</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Descrizione</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Categoria</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Metodo</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Importo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-cream-dark/30">
                    <td className="px-5 py-3 text-muted-foreground">
                      {formatDate(t.data)}
                    </td>
                    <td className="px-5 py-3 text-brown">
                      <div>{t.descrizione}</div>
                      {t.client_nome && (
                        <div className="text-xs text-muted-foreground">
                          {t.client_nome} {t.client_cognome}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground capitalize">{t.categoria}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {getMetodoLabel(t.metodo_pagamento)}
                    </td>
                    <td className={`px-5 py-3 text-right font-semibold ${t.tipo === "entrata" ? "text-success" : "text-red-500"}`}>
                      {t.tipo === "entrata" ? "+" : "-"}
                      {formatCurrency(Number(t.importo))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
