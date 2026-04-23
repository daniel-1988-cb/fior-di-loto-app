import { Card } from "@/components/ui";
import { Send, MousePointerClick, MessageSquareQuote, Star, ExternalLink } from "lucide-react";
import type { ReviewStats } from "@/lib/actions/reviews";

type Props = {
  stats: ReviewStats;
};

export function RecensioniStats({ stats }: Props) {
  const { sent, clicked, submitted, redirected_google, rating_media, rating_distribution } = stats;
  const clickRate = sent > 0 ? Math.round((clicked / sent) * 100) : 0;
  const submitRate = clicked > 0 ? Math.round((submitted / clicked) * 100) : 0;

  const total = Object.values(rating_distribution).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-5">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Send className="h-3.5 w-3.5" />
            <p className="text-xs uppercase tracking-wider">Inviati</p>
          </div>
          <p className="mt-2 text-3xl font-bold">{sent}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MousePointerClick className="h-3.5 w-3.5" />
            <p className="text-xs uppercase tracking-wider">Click</p>
          </div>
          <p className="mt-2 text-3xl font-bold">{clicked}</p>
          <p className="text-xs text-muted-foreground">
            {clickRate}% degli invii
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageSquareQuote className="h-3.5 w-3.5" />
            <p className="text-xs uppercase tracking-wider">Completati</p>
          </div>
          <p className="mt-2 text-3xl font-bold">{submitted}</p>
          <p className="text-xs text-muted-foreground">
            {submitRate}% dei click
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Star className="h-3.5 w-3.5" />
            <p className="text-xs uppercase tracking-wider">Rating medio</p>
          </div>
          <p className="mt-2 text-3xl font-bold flex items-center gap-1">
            {rating_media !== null ? rating_media.toFixed(1) : "\u2014"}
            {rating_media !== null && (
              <Star className="h-5 w-5 fill-warning text-warning" />
            )}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ExternalLink className="h-3.5 w-3.5" />
            <p className="text-xs uppercase tracking-wider">Su Google</p>
          </div>
          <p className="mt-2 text-3xl font-bold">{redirected_google}</p>
          <p className="text-xs text-muted-foreground">reindirizzamenti</p>
        </Card>
      </section>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Distribuzione rating</h3>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessuna recensione ricevuta ancora.
          </p>
        ) : (
          <div className="space-y-2">
            {([5, 4, 3, 2, 1] as const).map((n) => {
              const count = rating_distribution[n];
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={n} className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5 w-16 text-sm">
                    <span className="font-medium">{n}</span>
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  </div>
                  <div className="flex-1 h-6 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        n >= 4
                          ? "bg-success"
                          : n === 3
                            ? "bg-warning"
                            : "bg-danger"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-sm text-right text-muted-foreground">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
