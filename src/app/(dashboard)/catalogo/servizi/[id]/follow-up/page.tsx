export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { getService } from "@/lib/actions/services";
import {
  getFollowUpRules,
  getGlobalFollowUpDefaults,
} from "@/lib/actions/service-followups";
import { ServiceFollowUpClient } from "@/components/catalogo/service-followup-client";

export default async function ServiceFollowUpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await getService(id);

  if (!service) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          href="/catalogo/servizi"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Servizi
        </Link>
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Servizio non trovato.
        </div>
      </div>
    );
  }

  // Carica regole specifiche di questo servizio + i default globali, da
  // mostrare side-by-side (override vs fallback).
  const [serviceRules, globalDefaults] = await Promise.all([
    getFollowUpRules(id),
    getGlobalFollowUpDefaults(),
  ]);
  // getFollowUpRules(id) ritorna anche le globali — filtriamo solo quelle del servizio
  const serviceOnly = serviceRules.filter((r) => r.serviceId === id);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <Link
          href="/catalogo/servizi"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Servizi
        </Link>
      </div>

      <div className="mb-6 flex items-center gap-2">
        <div className="rounded-full bg-gradient-to-br from-rose/80 to-rose p-2 text-white">
          <MessageCircle className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Follow-up per {service.nome}
        </h1>
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        Sovrascrivi i messaggi automatici di questo servizio. Lascia vuoto un
        campo per usare il messaggio globale (configurabile in{" "}
        <Link
          href="/impostazioni/follow-up"
          className="text-primary hover:underline"
        >
          Impostazioni → Follow-up
        </Link>
        ).
      </p>

      <ServiceFollowUpClient
        serviceId={id}
        serviceRules={serviceOnly}
        globalDefaults={globalDefaults}
      />
    </div>
  );
}
