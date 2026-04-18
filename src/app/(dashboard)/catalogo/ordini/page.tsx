import { catalogoSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Button } from "@/components/ui";
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
          <h2 className="mt-4 text-lg font-semibold">Nessun ordine di stock</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Quando richiederai un riordino ai fornitori, gli ordini appariranno qui.
          </p>
          <Button className="mt-6" variant="outline">
            Nuovo ordine
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
