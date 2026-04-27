export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, CalendarCog } from "lucide-react";
import { Card } from "@/components/ui";
import { getBusinessHours } from "@/lib/actions/business";
import { OrariForm } from "./orari-form";

export default async function OrariImpostazioniPage() {
  const hours = await getBusinessHours();

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
          <CalendarCog className="h-6 w-6 text-rose" />
          <h1 className="font-display text-3xl">Orari di apertura</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Imposta gli orari standard del centro.
        </p>
      </header>

      <Card className="p-6">
        <OrariForm initial={hours} />
      </Card>
    </div>
  );
}
