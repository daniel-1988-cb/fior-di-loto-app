import { V2Shell } from "@/components/layout/v2-shell";
import { venditeSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Button } from "@/components/ui";
import { Package } from "lucide-react";

export default function V2OrdiniPage() {
  return (
    <V2Shell subNav={{ title: "Vendite", groups: venditeSubNav }}>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Ordini di prodotti</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vendite di prodotti in cassa e online.</p>
      </header>

      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Package className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Nessun ordine registrato</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Gli ordini di prodotti verranno raggruppati qui quando abiliterai lo shop digitale
            o registrerai vendite di prodotti in cassa.
          </p>
          <Button className="mt-6" variant="outline">
            Configura shop
          </Button>
        </CardContent>
      </Card>
    </V2Shell>
  );
}
