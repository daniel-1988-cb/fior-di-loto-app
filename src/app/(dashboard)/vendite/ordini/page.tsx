import { Card, CardContent } from "@/components/ui";
import { Package } from "lucide-react";

export default function V2OrdiniPage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Ordini di prodotti</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vendite di prodotti in cassa e online.
        </p>
      </header>

      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Package className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Disponibile in Fase 2</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Gli ordini di prodotti saranno disponibili quando la Fase 2 Catalogo porterà
            il modulo prodotti/inventario in gestionale. Nel frattempo le vendite di
            prodotti sono tracciate in{" "}
            <a href="/vendite/lista" className="underline">
              Lista transazioni
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </>
  );
}
