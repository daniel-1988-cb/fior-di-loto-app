import Link from "next/link";
import { Card, Button, Badge } from "@/components/ui";
import { Star } from "lucide-react";

export default function V2RecensioniPage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Valutazioni e recensioni</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Richieste feedback e integrazione Google Business.
        </p>
      </header>

      <section className="mb-6 grid gap-3 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Valutazione</p>
          <p className="mt-1 text-3xl font-bold flex items-center gap-1">
            — <Star className="h-5 w-5 fill-warning text-warning" />
          </p>
          <p className="text-xs text-muted-foreground">Connetti Google per importare</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Recensioni</p>
          <p className="mt-1 text-3xl font-bold">—</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Da richiedere</p>
          <p className="mt-1 text-3xl font-bold">—</p>
        </Card>
      </section>

      <Card className="py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Star className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">In arrivo</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Il modulo recensioni arriverà in una release successiva: invio automatico
          della richiesta review dopo ogni visita completata e import del rating Google.
          Nel frattempo puoi ricontattare manualmente chi è passato di recente.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Link href="/clienti?segmento=lotina">
            <Button>
              <Badge variant="primary" className="mr-1">TODO</Badge>
              Invia richiesta a clienti dell'ultimo mese
            </Button>
          </Link>
          <Link href="/marketing/campagne/nuova">
            <Button variant="outline">Crea campagna review</Button>
          </Link>
        </div>
        <p className="mx-auto mt-3 max-w-md text-xs text-muted-foreground">
          Il pulsante TODO non è ancora cablato — usa le campagne manuali per adesso.
        </p>
      </Card>
    </>
  );
}
