export const dynamic = "force-dynamic";

import { venditeSubNav } from "@/components/layout/v2-sidenav";
import { Card, Badge, Button } from "@/components/ui";
import { Plus } from "lucide-react";
import { getVouchers } from "@/lib/actions/vouchers";
import { formatCurrency } from "@/lib/utils";

export default async function V2VouchersPage() {
  const rows = await getVouchers();

  return (
    <>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buoni venduti</h1>
          <p className="mt-1 text-sm text-muted-foreground">{rows.length} buoni registrati.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> Aggiungi
        </Button>
      </header>

      <Card className="overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Codice</th>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-left font-medium">Acquistato da</th>
                <th className="px-4 py-3 text-left font-medium">Destinatario</th>
                <th className="px-4 py-3 text-left font-medium">Scadenza</th>
                <th className="px-4 py-3 text-right font-medium">Valore</th>
                <th className="px-4 py-3 text-center font-medium">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nessun buono registrato.
                  </td>
                </tr>
              ) : (
                rows.map((v) => (
                  <tr key={v.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-xs">{v.codice}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{v.tipo}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {v.acquistato_da
                        ? `${v.acquistato_da.nome} ${v.acquistato_da.cognome}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {v.destinatario
                        ? `${v.destinatario.nome} ${v.destinatario.cognome}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {v.data_scadenza
                        ? new Date(v.data_scadenza).toLocaleDateString("it-IT")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(v.valore)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={v.usato ? "default" : "success"}>
                        {v.usato ? "Utilizzato" : "Valido"}
                      </Badge>
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
