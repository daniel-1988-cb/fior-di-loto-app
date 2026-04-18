export const dynamic = "force-dynamic";

import { venditeSubNav } from "@/components/layout/v2-sidenav";
import { Card, Badge } from "@/components/ui";
import { getTransactions } from "@/lib/actions/transactions";
import { formatCurrency } from "@/lib/utils";

export default async function V2VenditeListaPage() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rows = await getTransactions(month);

  const entrate = rows.filter((r) => r.tipo === "entrata");

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Vendite del mese</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {entrate.length} transazioni registrate in{" "}
          {now.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}.
        </p>
      </header>

      <Card className="overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Categoria</th>
                <th className="px-4 py-3 text-left font-medium">Descrizione</th>
                <th className="px-4 py-3 text-left font-medium">Metodo</th>
                <th className="px-4 py-3 text-right font-medium">Importo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entrate.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nessuna vendita registrata questo mese.
                  </td>
                </tr>
              ) : (
                entrate.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">{new Date(t.data).toLocaleDateString("it-IT")}</td>
                    <td className="px-4 py-3 font-medium">
                      {t.clients ? `${t.clients.nome} ${t.clients.cognome}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {t.categoria ? <Badge variant="outline">{t.categoria}</Badge> : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.descrizione ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.metodo_pagamento ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(t.importo)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
