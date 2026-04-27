export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { Card } from "@/components/ui";
import { getBusinessSettings } from "@/lib/actions/business";
import { AziendaForm } from "./azienda-form";

export default async function AziendaImpostazioniPage() {
  const settings = await getBusinessSettings();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <Link
          href="/impostazioni"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Link>
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-rose" />
          <h1 className="font-display text-3xl">Configurazione attivit&agrave;</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Dati anagrafici, sede, fiscalit&agrave; e preferenze operative del centro.
        </p>
      </header>

      <Card className="p-6">
        <AziendaForm initial={settings} />
      </Card>
    </div>
  );
}
