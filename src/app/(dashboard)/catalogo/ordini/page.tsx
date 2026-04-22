import { Card, CardContent, Badge } from "@/components/ui";
import { Truck } from "lucide-react";

export default function V2OrdiniStockPage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Ordini di stock</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Riordini dai fornitori per reintegrare la giacenza.
        </p>
      </header>

      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Truck className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">
            Disponibile dopo integrazione fornitori
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            La gestione ordini di stock verrà attivata nella Fase 2.5 insieme
            alla tabella fornitori. Richiede una migration{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              purchase_orders
            </code>{" "}
            con righe prodotto, stato consegna e aggiornamento automatico
            giacenza all&apos;accettazione ordine.
          </p>
          <Badge variant="outline" className="mt-4">
            Fase 2.5
          </Badge>
        </CardContent>
      </Card>
    </>
  );
}
