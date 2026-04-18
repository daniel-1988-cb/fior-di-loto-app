export const dynamic = "force-dynamic";

import { V2Shell } from "@/components/layout/v2-shell";
import { catalogoSubNav } from "@/components/layout/v2-sidenav";
import { Card, Button, Badge } from "@/components/ui";
import { Plus, CreditCard } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";

export default async function V2AbbonamentiCatalogoPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("treatment_programs")
    .select("*")
    .eq("attivo", true)
    .order("nome");

  const programs = data ?? [];

  return (
    <V2Shell subNav={{ title: "Catalogo", groups: catalogoSubNav }}>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Abbonamenti</h1>
          <p className="mt-1 text-sm text-muted-foreground">Piani e pacchetti che puoi vendere.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> Nuovo piano
        </Button>
      </header>

      {programs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CreditCard className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Nessun abbonamento</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Crea un piano ricorrente con sedute incluse per fidelizzare le clienti.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{p.nome}</h3>
                  {p.categoria && (
                    <Badge variant="outline" className="mt-1 capitalize">
                      {p.categoria}
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold">{formatCurrency(p.prezzo)}</p>
              </div>
              {p.descrizione && (
                <p className="mt-3 text-sm text-muted-foreground">{p.descrizione}</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {p.sedute} sedute incluse
              </p>
            </Card>
          ))}
        </div>
      )}
    </V2Shell>
  );
}
