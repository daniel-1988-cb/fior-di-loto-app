export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Card } from "@/components/ui";
import { getBusinessSettings } from "@/lib/actions/business";
import { PagamentiForm } from "./pagamenti-form";

export default async function PagamentiImpostazioniPage() {
  const settings = await getBusinessSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <Link
          href="/impostazioni"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Link>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-gradient-to-br from-primary to-secondary p-2 text-white">
            <CreditCard className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Pagamenti e fiscalit&agrave;</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Aliquota IVA, valuta, metodi di pagamento e policy di cancellazione.
        </p>
      </header>

      <Card className="p-6">
        <PagamentiForm initial={settings} />
      </Card>
    </div>
  );
}
