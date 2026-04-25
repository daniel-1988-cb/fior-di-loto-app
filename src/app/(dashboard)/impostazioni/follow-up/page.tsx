export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { getGlobalFollowUpDefaults } from "@/lib/actions/service-followups";
import { FollowUpDefaultsClient } from "@/components/impostazioni/followup-defaults-client";

export default async function ImpostazioniFollowUpPage() {
  const defaults = await getGlobalFollowUpDefaults();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <Link
          href="/impostazioni"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Impostazioni
        </Link>
      </div>

      <div className="mb-6 flex items-center gap-2">
        <div className="rounded-full bg-gradient-to-br from-rose/80 to-rose p-2 text-white">
          <MessageCircle className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Follow-up automatici per servizio
        </h1>
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        Configura i messaggi WhatsApp che vengono inviati automaticamente prima
        e dopo gli appuntamenti. I default valgono per tutti i servizi; puoi
        sovrascriverli per un singolo servizio dalla scheda servizio.
      </p>

      <FollowUpDefaultsClient defaults={defaults} />
    </div>
  );
}
