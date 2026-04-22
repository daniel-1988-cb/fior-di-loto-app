import { Card, CardContent } from "@/components/ui";
import { Sparkles } from "lucide-react";

export default function V2AbbonamentiVenditiPage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Abbonamenti venduti</h1>
        <p className="mt-1 text-sm text-muted-foreground">Piani e pacchetti ricorrenti.</p>
      </header>

      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Disponibile in Fase 3</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            La gestione degli abbonamenti (pacchetti sedute, rinnovi automatici,
            scadenze) arriverà con la Fase 3 Clienti, dove l&apos;anagrafica sarà
            estesa per tracciare sedute residue e prossima scadenza.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
