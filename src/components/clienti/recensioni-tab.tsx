import { Star, Clock, Send } from "lucide-react";
import type { ClientReviewRow, ReviewRequestRow } from "@/lib/actions/reviews";

type Props = {
  reviews: ClientReviewRow[];
  pendingRequests: ReviewRequestRow[];
};

const CANALE_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

export function RecensioniTab({ reviews, pendingRequests }: Props) {
  if (reviews.length === 0 && pendingRequests.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Nessuna recensione.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pendingRequests.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h3 className="font-semibold text-brown">
              Richieste in sospeso{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({pendingRequests.length})
              </span>
            </h3>
          </div>
          <ul className="divide-y divide-border">
            {pendingRequests.map((req) => {
              const date = req.sent_at
                ? new Date(req.sent_at).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—";
              const clicked = Boolean(req.clicked_at);
              return (
                <li
                  key={req.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <Send className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-brown">
                      Richiesta {CANALE_LABEL[req.canale] || req.canale}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Inviata il {date}
                      {clicked && " • cliente ha aperto il link"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      clicked
                        ? "bg-info/15 text-info"
                        : "bg-warning/15 text-warning"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    {clicked ? "Cliccata" : "In attesa"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h3 className="font-semibold text-brown">
              Recensioni ricevute{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({reviews.length})
              </span>
            </h3>
          </div>
          <ul className="divide-y divide-border">
            {reviews.map((r) => {
              const date = r.created_at
                ? new Date(r.created_at).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—";
              return (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <Stars rating={r.rating} />
                    {r.published_google && (
                      <span className="inline-flex items-center rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                        Pubblicata su Google
                      </span>
                    )}
                  </div>
                  {r.testo && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-brown">
                      {r.testo}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">{date}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  const safe = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${
            n <= safe
              ? "fill-gold text-gold"
              : "fill-transparent text-muted-foreground"
          }`}
        />
      ))}
      <span className="ml-2 text-xs font-medium text-muted-foreground">
        {safe}/5
      </span>
    </div>
  );
}
