export const dynamic = "force-dynamic";

import Link from "next/link";
import { catalogoSubNav } from "@/components/layout/v2-sidenav";
import { Card, Button, Badge } from "@/components/ui";
import { Plus, Clock } from "lucide-react";
import { getServices } from "@/lib/actions/services";
import { formatCurrency } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ cat?: string }>;
}

export default async function V2CatalogoServiziPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const services = await getServices(sp.cat);

  const categories = Array.from(new Set(services.map((s) => s.categoria))).sort();
  const totalByCategory = services.reduce<Record<string, number>>((acc, s) => {
    acc[s.categoria] = (acc[s.categoria] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = sp.cat ? services.filter((s) => s.categoria === sp.cat) : services;

  return (
    <>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Elenco servizi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {services.length} servizi attivi · gestisci prezzo, durata e descrizione.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> Aggiungi
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border border-border bg-card/40 p-3">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categorie
          </p>
          <Link
            href="/catalogo/servizi"
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              !sp.cat ? "bg-muted font-semibold" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>Tutte le categorie</span>
            <span className="text-xs">{services.length}</span>
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/catalogo/servizi?cat=${encodeURIComponent(cat)}`}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                sp.cat === cat ? "bg-muted font-semibold" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="capitalize">{cat}</span>
              <span className="text-xs">{totalByCategory[cat]}</span>
            </Link>
          ))}
        </aside>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Nessun servizio in questa categoria.
            </Card>
          ) : (
            filtered.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{s.nome}</h3>
                      <Badge variant="outline" className="capitalize">
                        {s.categoria}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {s.durata} min
                      </span>
                    </div>
                    {s.descrizione && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {s.descrizione}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatCurrency(s.prezzo)}</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Modifica
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
