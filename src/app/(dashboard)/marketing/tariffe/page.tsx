import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { Zap } from "lucide-react";

export default function V2TariffeSmartPage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Tariffe smart</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Prezzi dinamici per fasce orarie.
        </p>
      </header>

      <Card className="py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Zap className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">
          Listini dinamici disponibili in versione futura
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          La tariffazione smart (sconti automatici nelle fasce meno piene e
          maggiorazioni nei picchi) richiede un motore di pricing non ancora
          implementato. Fino ad allora i listini restano statici dai servizi del catalogo.
        </p>
        <div className="mt-5">
          <Link href="/catalogo/servizi">
            <Button variant="outline">Vai al catalogo servizi</Button>
          </Link>
        </div>
      </Card>
    </>
  );
}
