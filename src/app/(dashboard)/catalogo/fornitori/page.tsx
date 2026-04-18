import { catalogoSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Button } from "@/components/ui";
import { Store } from "lucide-react";

export default function V2FornitoriPage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Fornitori</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Anagrafica dei fornitori per ordini e pagamenti.
        </p>
      </header>

      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Store className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Nessun fornitore</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Aggiungi i fornitori con cui lavori per tenere traccia degli ordini e delle condizioni.
          </p>
          <Button className="mt-6" variant="outline">
            Aggiungi fornitore
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
