export const dynamic = "force-dynamic";

import { V2Shell } from "@/components/layout/v2-shell";
import { catalogoSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Badge } from "@/components/ui";
import { Package, AlertTriangle } from "lucide-react";
import { getProducts } from "@/lib/actions/products";
import { formatCurrency } from "@/lib/utils";

export default async function V2InventarioPage() {
  const products = await getProducts();
  const totalValue = products.reduce(
    (s, p) => s + (p.prezzo ?? 0) * (p.giacenza ?? 0),
    0
  );
  const lowStock = products.filter(
    (p) => (p.giacenza ?? 0) <= (p.soglia_alert ?? 0)
  );
  const outOfStock = products.filter((p) => (p.giacenza ?? 0) <= 0);

  return (
    <V2Shell subNav={{ title: "Catalogo", groups: catalogoSubNav }}>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitora la giacenza di prodotti in magazzino.
        </p>
      </header>

      <section className="mb-6 grid gap-3 md:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Prodotti</p>
          <p className="mt-1 text-2xl font-bold">{products.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Valore stock</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(totalValue)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">In alert</p>
          <p className="mt-1 text-2xl font-bold text-warning">{lowStock.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Esauriti</p>
          <p className="mt-1 text-2xl font-bold text-danger">{outOfStock.length}</p>
        </Card>
      </section>

      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-4 text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Scorte basse
          </h2>
          {lowStock.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Tutti i prodotti sono sopra la soglia di alert.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-warning/10 p-2 text-warning">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Giacenza: {p.giacenza} · soglia: {p.soglia_alert ?? 0}
                      </p>
                    </div>
                  </div>
                  <Badge variant={(p.giacenza ?? 0) <= 0 ? "danger" : "warning"}>
                    {(p.giacenza ?? 0) <= 0 ? "Esaurito" : "In alert"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </V2Shell>
  );
}
