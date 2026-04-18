import { clientiSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Button, Badge } from "@/components/ui";
import { Heart, Star, Gift } from "lucide-react";

export default function V2FidelizzazionePage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Fidelizzazione del cliente</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Premia le clienti fedeli con un programma punti personalizzato.
        </p>
      </header>

      <Card>
        <CardContent className="py-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Heart className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">Programma fedeltà in arrivo</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Sarai in grado di assegnare punti per ogni visita, convertire i punti in sconti,
            creare tier VIP e inviare inviti esclusivi alle tue clienti fedeli.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
            <Badge variant="outline">
              <Star className="mr-1 h-3 w-3" /> Punti visita
            </Badge>
            <Badge variant="outline">
              <Gift className="mr-1 h-3 w-3" /> Premi su misura
            </Badge>
            <Badge variant="outline">Tier VIP</Badge>
          </div>
          <Button className="mt-6" variant="outline">
            Resta aggiornata
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
