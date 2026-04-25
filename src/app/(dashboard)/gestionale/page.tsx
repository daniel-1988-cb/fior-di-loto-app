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
  case "saldo": return "Saldo cliente";
  default: return metodo || "—";
 }
}

export default async function GestionalePage({
 searchParams,
}: {
 searchParams: Promise<{ month?: string }>;
}) {
 const { month } = await searchParams;

 const now = new Date();
 const todayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
 const currentMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : todayMonth;

 const [summary, transactions] = await Promise.all([
  getFinancialSummary(currentMonth),
  getTransactions(currentMonth),
 ]);

 const recentTransactions = (transactions as unknown as Transaction[]).slice(0, 20);

 return (
  <div>
   {/* Header */}
   <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
     <h1 className="font-display text-3xl font-bold text-brown">
      Gestionale
     </h1>
     <p className="mt-1 text-sm text-muted-foreground">Riepilogo finanziario mensile</p>
    </div>
    <div className="flex items-center gap-3">
     <Link
      href="/gestionale/voucher"
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-brown hover:bg-cream-dark"
     >
      Gestisci Voucher →
     </Link>
     <Link
      href="/gestionale/nuovo"
      className="inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-dark"
     >
      <Plus className="h-4 w-4" />
      Nuova Transazione
     </Link>
    </div>
   </div>

   {/* Month selector */}
   <div className="mb-6 flex items-center gap-3">
    {(() => {
     const [y, m] = currentMonth.split('-').map(Number);
     const prevDate = new Date(y, m - 2, 1);
     const prev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
     const nextDate = new Date(y, m, 1);
     const next = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
     return (
      <>
       <Link href={`/gestionale?month=${prev}`} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-cream-dark">←</Link>
       <span className="font-semibold text-brown capitalize">
        {new Date(currentMonth + '-01').toLocaleDateString('it-IT', {month: 'long', year: 'numeric'})}
       </span>
       <Link href={`/gestionale?month=${next}`} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-cream-dark">→</Link>
       {currentMonth !== todayMonth && (
        <Link href="/gestionale" className="rounded-lg bg-rose/10 px-3 py-1.5 text-sm font-medium text-rose hover:bg-rose/20">Oggi</Link>
       )}
      </>
     );
    })()}
   </div>

   {/* KPI Cards */}
   <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div className="rounded-lg border border-border bg-card p-5">
     <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Entrate Mese</p>
      <TrendingUp className="h-5 w-5 text-success" />
     </div>
     <p className="mt-2 text-2xl font-bold text-brown">
      {formatCurrency(summary.entrate)}
     </p>
    </div>

    <div className="rounded-lg border border-border bg-card p-5">
     <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Uscite Mese</p>
      <TrendingDown className="h-5 w-5 text-red-500" />
     </div>
     <p className="mt-2 text-2xl font-bold text-brown">
      {formatCurrency(summary.uscite)}
     </p>
    </div>

    <div className="rounded-lg border border-border bg-card p-5">
     <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Profitto Netto</p>
      <Wallet className="h-5 w-5 text-gold" />
     </div>
     <p className={`mt-2 text-2xl font-bold ${summary.profitto >= 0 ? "text-success" : "text-red-500"}`}>
      {formatCurrency(summary.profitto)}
     </p>
    </div>

    <div className="rounded-lg border border-border bg-card p-5">
     <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Obiettivo Mensile</p>
      <Target className="h-5 w-5 text-rose" />
     </div>
     <p className="mt-2 text-2xl font-bold text-brown">
      {summary.percentuale}%
     </p>
     <div className="mt-3">
      <div className="h-2 w-full overflow-hidden rounded-full bg-cream-dark">
       <div
        className="h-full rounded-full bg-rose transition-all"
        style={{ width: `${summary.percentuale}%` }}
       />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
       {formatCurrency(summary.entrate)} / {formatCurrency(summary.obiettivo)}
      </p>
     </div>
    </div>
   </div>

   {/* Transactions Table */}
   <div className="rounded-lg border border-border bg-card">
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
         <th className="px-3 py-3 text-left font-medium text-muted-foreground sm:px-5">Data</th>
         <th className="px-3 py-3 text-left font-medium text-muted-foreground sm:px-5">Descrizione</th>
         <th className="hidden px-5 py-3 text-left font-medium text-muted-foreground sm:table-cell">Categoria</th>
         <th className="hidden px-5 py-3 text-left font-medium text-muted-foreground sm:table-cell">Metodo</th>
         <th className="px-3 py-3 text-right font-medium text-muted-foreground sm:px-5">Importo</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-border">
        {recentTransactions.map((t) => (
         <tr key={t.id} className="hover:bg-cream-dark/30">
          <td className="px-3 py-3 text-muted-foreground sm:px-5">
           {formatDate(t.data)}
          </td>
          <td className="px-3 py-3 text-brown sm:px-5">
           <div>{t.descrizione}</div>
           {t.client_nome && (
            <div className="text-xs text-muted-foreground">
             {t.client_nome} {t.client_cognome}
            </div>
           )}
           {/* Su mobile mostra categoria e metodo inline */}
           <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground sm:hidden">
            <span className="capitalize">{t.categoria}</span>
            <span>·</span>
            <span>{getMetodoLabel(t.metodo_pagamento)}</span>
           </div>
          </td>
          <td className="hidden px-5 py-3 text-muted-foreground capitalize sm:table-cell">{t.categoria}</td>
          <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">
           {getMetodoLabel(t.metodo_pagamento)}
          </td>
          <td className={`px-3 py-3 text-right font-semibold sm:px-5 ${t.tipo === "entrata" ? "text-success" : "text-red-500"}`}>
           {t.tipo === "entrata" ? "+" : "-"}
           {formatCurrency(Number(t.importo))}
          </td>
         </tr>
        ))}
       </tbody>
      </table>

      {/* Payment breakdown */}
      {recentTransactions.filter(t => t.tipo === 'entrata').length > 0 && (
       <div className="mt-4 border-t border-border px-5 pb-5 pt-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Entrate per metodo</p>
        <div className="flex flex-wrap gap-3">
         {Object.entries(
          recentTransactions
           .filter(t => t.tipo === 'entrata')
           .reduce((acc: Record<string, number>, t) => {
            const k = t.metodo_pagamento || 'altro';
            acc[k] = (acc[k] || 0) + Number(t.importo);
            return acc;
           }, {})
         ).map(([metodo, totale]) => (
          <div key={metodo} className="rounded-lg bg-cream-dark px-3 py-1.5 text-xs">
           <span className="capitalize text-muted-foreground">{metodo}</span>
           <span className="ml-2 font-semibold text-brown">{formatCurrency(totale)}</span>
          </div>
         ))}
        </div>
       </div>
      )}
     </div>
    )}
   </div>
  </div>
 );
}
