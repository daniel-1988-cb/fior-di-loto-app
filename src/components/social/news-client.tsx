"use client";

import { useState, useTransition } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import { fetchNews } from "@/lib/actions/news";
import type { NewsItem } from "@/lib/actions/news";

const CATEGORIE = [
  { value: "tutti", label: "Tutti" },
  { value: "industry", label: "Industry" },
  { value: "trends", label: "Trends" },
  { value: "skin", label: "Skin" },
  { value: "nails", label: "Nails" },
  { value: "wellness", label: "Wellness" },
];

const CATEGORIA_COLORS: Record<string, string> = {
  industry: "bg-rose/10 text-rose",
  trends: "bg-gold/20 text-gold-dark",
  skin: "bg-info/10 text-info",
  nails: "bg-purple-100 text-purple-700",
  wellness: "bg-success/10 text-success",
};

function formatDate(isoDate: string) {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(isoDate));
  } catch {
    return "";
  }
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORIA_COLORS[item.categoria] || "bg-muted text-muted-foreground"}`}>
          {item.fonte}
        </span>
        <span className="text-xs text-muted-foreground">{formatDate(item.data)}</span>
      </div>

      <h3 className="mb-1 font-semibold text-brown leading-snug">
        {item.titolo}
      </h3>

      {item.descrizione && (
        <p className="mb-3 text-sm text-muted-foreground line-clamp-3">
          {item.descrizione}
        </p>
      )}

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm font-medium text-rose hover:text-rose-dark"
      >
        Leggi
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm animate-pulse">
      <div className="mb-2 flex gap-2">
        <div className="h-5 w-24 rounded-full bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="mb-1 h-5 w-3/4 rounded bg-muted" />
      <div className="mb-1 h-4 w-full rounded bg-muted" />
      <div className="mb-3 h-4 w-2/3 rounded bg-muted" />
      <div className="h-4 w-16 rounded bg-muted" />
    </div>
  );
}

export function NewsClient({ initialNews }: { initialNews: NewsItem[] }) {
  const [news, setNews] = useState<NewsItem[]>(initialNews);
  const [categoria, setCategoria] = useState("tutti");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isPending, startTransition] = useTransition();

  function handleCategoriaChange(cat: string) {
    setCategoria(cat);
    startTransition(async () => {
      const data = await fetchNews(cat === "tutti" ? undefined : cat);
      setNews(data);
      setLastUpdate(new Date());
    });
  }

  function handleRefresh() {
    startTransition(async () => {
      const data = await fetchNews(categoria === "tutti" ? undefined : categoria);
      setNews(data);
      setLastUpdate(new Date());
    });
  }

  const filteredNews = categoria === "tutti"
    ? news
    : news.filter((n) => n.categoria === categoria);

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {CATEGORIE.map((c) => (
            <button
              key={c.value}
              onClick={() => handleCategoriaChange(c.value)}
              disabled={isPending}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                categoria === c.value
                  ? "bg-brown text-white"
                  : "border border-border bg-card text-muted-foreground hover:bg-cream-dark hover:text-brown"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Aggiornato {new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(lastUpdate)}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-brown hover:bg-cream-dark disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            Aggiorna
          </button>
        </div>
      </div>

      {/* News grid */}
      {isPending ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="mb-1 font-medium text-brown">Nessuna news disponibile</p>
          <p className="text-sm text-muted-foreground">
            I feed RSS potrebbero essere temporaneamente non disponibili. Riprova più tardi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredNews.map((item, i) => (
            <NewsCard key={`${item.url}-${i}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
