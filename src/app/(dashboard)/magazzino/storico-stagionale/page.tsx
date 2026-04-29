export const dynamic = "force-dynamic";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui";
import {
  getProductMonthlySales,
  getProductCategorie,
} from "@/lib/actions/seasonal-history";
import { StoricoStagionaleClient } from "./storico-client";

export default async function StoricoStagionalePage() {
  const [items, categorie] = await Promise.all([
    getProductMonthlySales({ attiviSolo: true }),
    getProductCategorie(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/magazzino/riordino"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Riordino consigliato
        </Link>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl text-foreground">
          Storico stagionale
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vendite medie per mese (calcolate sull'intero storico). Identifica i
          pattern stagionali per pianificare ordini con anticipo.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nessuno storico disponibile.
          </CardContent>
        </Card>
      ) : (
        <StoricoStagionaleClient items={items} categorie={categorie} />
      )}
    </div>
  );
}
