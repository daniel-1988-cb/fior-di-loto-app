import { V2Shell } from "@/components/layout/v2-shell";
import { marketingSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Button, Badge } from "@/components/ui";
import { Star } from "lucide-react";

export default function V2RecensioniPage() {
  return (
    <V2Shell subNav={{ title: "Marketing", groups: marketingSubNav }}>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Valutazioni e recensioni</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Raccogli feedback e migliora il tuo rating pubblico.
        </p>
      </header>

      <section className="mb-6 grid gap-3 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Valutazione</p>
          <p className="mt-1 text-3xl font-bold flex items-center gap-1">
            0.0 <Star className="h-5 w-5 fill-warning text-warning" />
          </p>
          <p className="text-xs text-muted-foreground">Nessuna recensione</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Recensioni</p>
          <p className="mt-1 text-3xl font-bold">0</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Da richiedere</p>
          <p className="mt-1 text-3xl font-bold">0</p>
        </Card>
      </section>

      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Star className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Connetti Google</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Collega il profilo Google Business per importare le recensioni e richiedere nuovi
            feedback automaticamente dopo ogni appuntamento.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Button>Connetti Google</Button>
            <Button variant="outline">
              <Badge variant="primary" className="mr-1">NEW</Badge> Richiesta SMS
            </Button>
          </div>
        </CardContent>
      </Card>
    </V2Shell>
  );
}
