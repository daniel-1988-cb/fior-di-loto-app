import { Card } from "@/components/ui";
import { Star, ExternalLink } from "lucide-react";
import type { ClientReviewRow } from "@/lib/actions/reviews";

type Props = {
  reviews: ClientReviewRow[];
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function RecensioniList({ reviews }: Props) {
  if (reviews.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nessuna recensione ancora. Le prime arriveranno quando i clienti
          risponderanno alle richieste post-visita.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => {
        const clientsRel = Array.isArray(r.clients) ? r.clients[0] : r.clients;
        const name = clientsRel
          ? `${clientsRel.nome} ${clientsRel.cognome}`.trim()
          : "Cliente";
        return (
          <Card key={r.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-4 w-4 ${
                          n <= r.rating
                            ? "fill-warning text-warning"
                            : "text-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{name}</span>
                  {r.published_google && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success px-2 py-0.5 text-xs"
                      title="Reindirizzato su Google"
                    >
                      <ExternalLink className="h-3 w-3" /> Google
                    </span>
                  )}
                </div>
                {r.testo && (
                  <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">
                    {r.testo}
                  </p>
                )}
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(r.created_at)}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
