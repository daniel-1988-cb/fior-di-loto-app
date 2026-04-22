import { Card, CardContent, Badge } from "@/components/ui";
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
          <h2 className="mt-4 text-lg font-semibold">In arrivo</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Anagrafica fornitori (nome, p.iva, contatti, prodotti forniti,
            condizioni pagamento) sarà implementata nella Fase 2.5 con la
            migration{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              suppliers
            </code>{" "}
            e i link con prodotti/ordini.
          </p>
          <Badge variant="outline" className="mt-4">
            Fase 2.5
          </Badge>
        </CardContent>
      </Card>
    </>
  );
}
