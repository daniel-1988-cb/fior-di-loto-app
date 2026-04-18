export const dynamic = "force-dynamic";

import { catalogoSubNav } from "@/components/layout/v2-sidenav";
import { Card, Button, Badge } from "@/components/ui";
import { Plus, AlertTriangle } from "lucide-react";
import { getProducts } from "@/lib/actions/products";
import { formatCurrency } from "@/lib/utils";

export default async function V2ProdottiPage() {
  const products = await getProducts();

  return (
    <>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prodotti</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length} prodotti in catalogo.
          </p>
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
                <th className="px-4 py-3 text-left font-medium">Prodotto</th>
                <th className="px-4 py-3 text-left font-medium">Categoria</th>
                <th className="px-4 py-3 text-right font-medium">Giacenza</th>
                <th className="px-4 py-3 text-right font-medium">Soglia alert</th>
                <th className="px-4 py-3 text-right font-medium">Prezzo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nessun prodotto.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const lowStock = (p.giacenza ?? 0) <= (p.soglia_alert ?? 0);
                  return (
                    <tr key={p.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.nome}</div>
                        {p.descrizione && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {p.descrizione}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.categoria ? <Badge variant="outline">{p.categoria}</Badge> : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            lowStock ? "text-danger" : ""
                          }`}
                        >
                          {lowStock && <AlertTriangle className="h-3.5 w-3.5" />}
                          {p.giacenza ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {p.soglia_alert ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(p.prezzo)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
