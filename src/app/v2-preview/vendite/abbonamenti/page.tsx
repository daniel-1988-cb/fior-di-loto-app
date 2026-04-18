import { V2Shell } from "@/components/layout/v2-shell";
import { venditeSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Button } from "@/components/ui";
import { Sparkles } from "lucide-react";

export default function V2AbbonamentiVenditiPage() {
  return (
    <V2Shell subNav={{ title: "Vendite", groups: venditeSubNav }}>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Abbonamenti venduti</h1>
        <p className="mt-1 text-sm text-muted-foreground">Piani e pacchetti ricorrenti.</p>
      </header>

      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Abbonamenti in arrivo</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Sarai in grado di vendere pacchetti con sedute incluse, rinnovi automatici e sconti
            dedicati alle clienti fedeli.
          </p>
          <Button className="mt-6" variant="outline">
            Configura
          </Button>
        </CardContent>
      </Card>
    </V2Shell>
  );
}
