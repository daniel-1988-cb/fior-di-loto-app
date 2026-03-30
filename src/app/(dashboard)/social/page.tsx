export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus, Camera, Globe } from "lucide-react";
import { getSocialPosts } from "@/lib/actions/social";

type SocialPost = {
  id: string;
  piattaforma: string;
  tipo_contenuto: string;
  titolo: string;
  caption: string | null;
  hashtags: string[] | null;
  data_pubblicazione: string;
  stato: string;
  keyword: string | null;
};

function getTipoStyle(tipo: string) {
  switch (tipo) {
    case "reel_hook": return "bg-rose/20 text-rose-dark";
    case "educational": return "bg-gold/20 text-gold-dark";
    case "prima_dopo": return "bg-success/20 text-success";
    case "connessione": return "bg-info/20 text-info";
    case "prodotto": return "bg-purple-100 text-purple-700";
    default: return "bg-muted text-muted-foreground";
  }
}

function getTipoLabel(tipo: string) {
  switch (tipo) {
    case "reel_hook": return "Reel";
    case "educational": return "Edu";
    case "prima_dopo": return "Prima/Dopo";
    case "connessione": return "Connessione";
    case "prodotto": return "Prodotto";
    default: return tipo;
  }
}

function getStatoStyle(stato: string) {
  switch (stato) {
    case "bozza": return "bg-muted text-muted-foreground";
    case "programmato": return "bg-info/20 text-info";
    case "pubblicato": return "bg-success/20 text-success";
    default: return "bg-muted text-muted-foreground";
  }
}

function getStatoLabel(stato: string) {
  switch (stato) {
    case "bozza": return "Bozza";
    case "programmato": return "Programmato";
    case "pubblicato": return "Pubblicato";
    default: return stato;
  }
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  // 0=Sun, 1=Mon etc. We want Mon=0
  const d = new Date(year, month - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export default async function SocialPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const posts = await getSocialPosts(monthStr) as unknown as SocialPost[];

  // Map posts by day
  const postsByDay: Record<number, SocialPost[]> = {};
  for (const p of posts) {
    const day = new Date(p.data_pubblicazione + "T00:00:00").getDate();
    if (!postsByDay[day]) postsByDay[day] = [];
    postsByDay[day].push(p);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOffset = getFirstDayOfWeek(year, month);
  const today = now.getDate();

  const monthName = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );

  const weekDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
            Social Media
          </h1>
          <p className="mt-1 text-sm text-muted-foreground capitalize">
            {monthName} — {posts.length} post programmati
          </p>
        </div>
        <Link
          href="/social/nuovo"
          className="inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-dark"
        >
          <Plus className="h-4 w-4" />
          Nuovo Post
        </Link>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-3">
        {[
          { tipo: "reel_hook", label: "Reel" },
          { tipo: "educational", label: "Educational" },
          { tipo: "prima_dopo", label: "Prima/Dopo" },
          { tipo: "connessione", label: "Connessione" },
          { tipo: "prodotto", label: "Prodotto" },
        ].map((item) => (
          <span
            key={item.tipo}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getTipoStyle(item.tipo)}`}
          >
            {item.label}
          </span>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border/50 bg-cream-dark/20" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayPosts = postsByDay[day] || [];
            const isCurrentDay = day === today;

            return (
              <div
                key={day}
                className={`min-h-[80px] border-b border-r border-border/50 p-1.5 ${
                  isCurrentDay ? "bg-rose/5" : ""
                }`}
              >
                <div
                  className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isCurrentDay
                      ? "bg-rose text-white"
                      : "text-brown"
                  }`}
                >
                  {day}
                </div>
                <div className="space-y-1">
                  {dayPosts.slice(0, 3).map((post) => (
                    <div
                      key={post.id}
                      className={`rounded px-1.5 py-0.5 text-xs font-medium leading-tight truncate ${getTipoStyle(post.tipo_contenuto)}`}
                      title={post.titolo}
                    >
                      <span className="mr-1">
                        {post.piattaforma === "instagram" ? (
                          <Camera className="inline h-2.5 w-2.5" />
                        ) : (
                          <Globe className="inline h-2.5 w-2.5" />
                        )}
                      </span>
                      {post.titolo}
                    </div>
                  ))}
                  {dayPosts.length > 3 && (
                    <div className="text-xs text-muted-foreground">+{dayPosts.length - 3}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming posts list */}
      {posts.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-4 font-semibold text-brown">Tutti i Post del Mese</h2>
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream-dark">
                  {post.piattaforma === "instagram" ? (
                    <Camera className="h-5 w-5 text-rose" />
                  ) : (
                    <Globe className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-brown truncate">{post.titolo}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getTipoStyle(post.tipo_contenuto)}`}>
                      {getTipoLabel(post.tipo_contenuto)}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatoStyle(post.stato)}`}>
                      {getStatoLabel(post.stato)}
                    </span>
                  </div>
                  {post.keyword && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Keyword: {post.keyword}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short" }).format(
                    new Date(post.data_pubblicazione + "T00:00:00")
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
