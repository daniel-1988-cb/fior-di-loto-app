export const dynamic = "force-dynamic";

import { Card, CardContent, Badge } from "@/components/ui";
import { getTransactions } from "@/lib/actions/transactions";
import { formatCurrency } from "@/lib/utils";

export default async function V2PagamentiPage() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rows = await getTransactions(month);
  const entrate = rows.filter((r) => r.tipo === "entrata");

  const byMetodo = entrate.reduce<Record<string, { count: number; total: number }>>((acc, t) => {
    const k = t.metodo_pagamento ?? "Non specificato";
    acc[k] ??= { count: 0, total: 0 };
    acc[k].count += 1;
    acc[k].total += t.importo;
    return acc;
  }, {});

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Pagamenti</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Metodi di pagamento utilizzati questo mese. Il breakdown completo con filtri
          avanzati arriverà in Fase 5 Reports.
        </p>
      </header>

      <section className="mb-6 grid gap-3 md:grid-cols-3">
        {Object.entries(byMetodo).map(([k, v]) => (
          <Card key={k}>
            <CardContent className="pt-5">
              <Badge variant="outline">{k}</Badge>
              <p className="mt-3 text-2xl font-bold">{formatCurrency(v.total)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{v.count} transazioni</p>
            </CardContent>
          </Card>
        ))}
        {Object.keys(byMetodo).length === 0 && (
          <Card className="md:col-span-3">
            <CardContent className="py-10 text-center text-muted-foreground">
              Nessun pagamento registrato questo mese.
            </CardContent>
          </Card>
        )}
      </section>

      <Card className="overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Metodo</th>
                <th className="px-4 py-3 text-right font-medium">Importo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entrate.map((t) => (
                <tr key={t.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">{new Date(t.data).toLocaleDateString("it-IT")}</td>
                  <td className="px-4 py-3 font-medium">
                    {t.clients ? `${t.clients.nome} ${t.clients.cognome}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{t.metodo_pagamento ?? "—"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(t.importo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
