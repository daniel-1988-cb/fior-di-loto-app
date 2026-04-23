export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { Settings2, ExternalLink, Info } from "lucide-react";
import { getReviewStats, getRecentReviews } from "@/lib/actions/reviews";
import { getBusinessSettings } from "@/lib/actions/business";
import { RecensioniStats } from "@/components/marketing/recensioni-stats";
import { RecensioniList } from "@/components/marketing/recensioni-list";

export default async function V2RecensioniPage() {
  const [stats, recent, business] = await Promise.all([
    getReviewStats(),
    getRecentReviews(20),
    getBusinessSettings(),
  ]);

  const googleUrl =
    (business as unknown as { google_review_url?: string | null } | null)
      ?.google_review_url ?? null;

  return (
    <>
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Valutazioni e recensioni
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Richieste post-visita automatiche e feedback ricevuto. Le 4-5 stelle
            vengono indirizzate su Google Maps.
          </p>
        </div>
        <Link href="/impostazioni/azienda">
          <Button variant="outline">
            <Settings2 className="h-4 w-4" />
            Configura
          </Button>
        </Link>
      </header>

      {!googleUrl && (
        <Card className="mb-6 p-4 border-warning/30 bg-warning/5 flex items-start gap-3">
          <Info className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium">URL Google recensioni non configurato.</p>
            <p className="text-muted-foreground mt-1">
              Senza URL Google, le recensioni 4-5 stelle non vengono reindirizzate
              sulla scheda pubblica. Impostalo in{" "}
              <Link
                href="/impostazioni/azienda"
                className="underline text-foreground"
              >
                Impostazioni &rarr; Azienda
              </Link>
              .
            </p>
          </div>
        </Card>
      )}

      {googleUrl && (
        <Card className="mb-6 p-4 border-success/30 bg-success/5 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <ExternalLink className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div className="text-sm min-w-0">
              <p className="font-medium">Redirect Google attivo</p>
              <p className="text-muted-foreground mt-1 truncate">
                {googleUrl}
              </p>
            </div>
          </div>
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap underline"
          >
            Apri
          </a>
        </Card>
      )}

      <section className="mb-8">
        <RecensioniStats stats={stats} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recensioni recenti</h2>
        <RecensioniList reviews={recent} />
      </section>
    </>
  );
}
