export const dynamic = "force-dynamic";

import { venditeSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Button } from "@/components/ui";
import { Plus, Download } from "lucide-react";
import { getFinancialSummary, getTransactions } from "@/lib/actions/transactions";
import { getAppuntamentiOggi } from "@/lib/actions/dashboard";
import { formatCurrency } from "@/lib/utils";

export default async function V2VenditePage() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [summary, transactions, appOggi] = await Promise.all([
    getFinancialSummary(month),
    getTransactions(month),
    getAppuntamentiOggi(),
  ]);

  const today = now.toISOString().slice(0, 10);
  const todayTx = transactions.filter((t) => t.data === today);

  const transazioniPerTipo = {
    Servizi: todayTx.filter((t) => t.tipo === "entrata" && t.categoria === "servizio"),
    Prodotti: todayTx.filter((t) => t.tipo === "entrata" && t.categoria === "prodotto"),
    Voucher: todayTx.filter((t) => t.tipo === "entrata" && t.categoria === "voucher"),
    Altro: todayTx.filter((t) => t.tipo === "entrata" && !["servizio", "prodotto", "voucher"].includes(t.categoria ?? "")),
  };

  const pagamentiPerMetodo = todayTx.reduce<Record<string, number>>((acc, t) => {
    if (t.tipo !== "entrata") return acc;
    const k = t.metodo_pagamento ?? "Altro";
    acc[k] = (acc[k] ?? 0) + t.importo;
    return acc;
  }, {});

  return (
    <>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendite giornaliere</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Transazioni e movimenti di cassa di {now.toLocaleDateString("it-IT")}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4" /> Esporta
          </Button>
          <Button>
            <Plus className="h-4 w-4" /> Aggiungi
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard title="Entrate mese" value={formatCurrency(summary.entrate)} trend="" />
        <StatCard title="Uscite mese" value={formatCurrency(summary.uscite)} trend="" />
        <StatCard
          title="Saldo mese"
          value={formatCurrency((summary.entrate ?? 0) - (summary.uscite ?? 0))}
          trend=""
        />
        <StatCard title="Appuntamenti oggi" value={`${appOggi.totali}`} trend={`${appOggi.completati} completati`} />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 text-base font-semibold">Riepilogo transazioni (oggi)</h2>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2 text-left font-medium">Tipo</th>
                  <th className="pb-2 text-right font-medium">Quantità</th>
                  <th className="pb-2 text-right font-medium">Totale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(transazioniPerTipo).map(([k, rows]) => {
                  const tot = rows.reduce((s, r) => s + r.importo, 0);
                  return (
                    <tr key={k}>
                      <td className="py-2.5 font-medium">{k}</td>
                      <td className="py-2.5 text-right">{rows.length}</td>
                      <td className="py-2.5 text-right font-semibold">{formatCurrency(tot)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 text-base font-semibold">Movimenti di cassa (oggi)</h2>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2 text-left font-medium">Metodo pagamento</th>
                  <th className="pb-2 text-right font-medium">Totale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.keys(pagamentiPerMetodo).length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-6 text-center text-muted-foreground">
                      Nessun pagamento registrato oggi.
                    </td>
                  </tr>
                ) : (
                  Object.entries(pagamentiPerMetodo).map(([k, v]) => (
                    <tr key={k}>
                      <td className="py-2.5 font-medium">{k}</td>
                      <td className="py-2.5 text-right font-semibold">{formatCurrency(v)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function StatCard({ title, value, trend }: { title: string; value: string; trend?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="mt-2 text-2xl font-bold">{value}</p>
        {trend && <p className="mt-1 text-xs text-muted-foreground">{trend}</p>}
      </CardContent>
    </Card>
  );
}
