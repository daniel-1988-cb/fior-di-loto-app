"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { SocialPost } from "@/app/(dashboard)/social/page";
import { getTipoStyle, getTipoLabel, PiattaformaIcon } from "@/app/(dashboard)/social/page";

const PIATTAFORME = [
 { value: "tutti", label: "Tutti" },
 { value: "instagram", label: "Instagram" },
 { value: "facebook", label: "Facebook" },
 { value: "tiktok", label: "TikTok" },
];

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const LEGENDA = [
 { tipo: "reel_hook", label: "Reel" },
 { tipo: "educational", label: "Educational" },
 { tipo: "prima_dopo", label: "Prima/Dopo" },
 { tipo: "connessione", label: "Connessione" },
 { tipo: "prodotto", label: "Prodotto" },
];

function getDaysInMonth(year: number, month: number) {
 return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
 const d = new Date(year, month - 1, 1).getDay();
 return d === 0 ? 6 : d - 1;
}

function formatDateFull(dateStr: string) {
 return new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
 }).format(new Date(dateStr + "T00:00:00"));
}

export function CalendarioClient({ posts }: { posts: SocialPost[] }) {
 const now = new Date();
 const [year, setYear] = useState(now.getFullYear());
 const [month, setMonth] = useState(now.getMonth() + 1);
 const [piattaforma, setPiattaforma] = useState("tutti");
 const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);

 function prevMonth() {
  if (month === 1) { setMonth(12); setYear((y) => y - 1); }
  else setMonth((m) => m - 1);
 }

 function nextMonth() {
  if (month === 12) { setMonth(1); setYear((y) => y + 1); }
  else setMonth((m) => m + 1);
 }

 function goToday() {
  setYear(now.getFullYear());
  setMonth(now.getMonth() + 1);
 }

 const filtered = posts.filter((p) => {
  if (piattaforma !== "tutti" && p.piattaforma !== piattaforma) return false;
  return true;
 });

 // Group by day for current month
 const postsByDay: Record<number, SocialPost[]> = {};
 for (const p of filtered) {
  const d = new Date(p.data_pubblicazione + "T00:00:00");
  if (d.getFullYear() === year && d.getMonth() + 1 === month) {
   const day = d.getDate();
   if (!postsByDay[day]) postsByDay[day] = [];
   postsByDay[day].push(p);
  }
 }

 const daysInMonth = getDaysInMonth(year, month);
 const firstDayOffset = getFirstDayOfWeek(year, month);
 const today = now.getDate();
 const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;

 const monthName = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(
  new Date(year, month - 1, 1)
 );

 return (
  <div>
   {/* Legenda */}
   <div className="mb-4 flex flex-wrap gap-2">
    {LEGENDA.map((item) => (
     <span
      key={item.tipo}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getTipoStyle(item.tipo)}`}
     >
      {item.label}
     </span>
    ))}
   </div>

   {/* Controls */}
   <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    {/* Month navigation */}
    <div className="flex items-center gap-2">
     <button
      onClick={prevMonth}
      className="rounded-lg border border-border bg-card p-2 text-brown hover:bg-cream-dark"
     >
      <ChevronLeft className="h-4 w-4" />
     </button>
     <span className="min-w-[160px] text-center font-semibold text-brown capitalize">
      {monthName}
     </span>
     <button
      onClick={nextMonth}
      className="rounded-lg border border-border bg-card p-2 text-brown hover:bg-cream-dark"
     >
      <ChevronRight className="h-4 w-4" />
     </button>
     <button
      onClick={goToday}
      className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-brown hover:bg-cream-dark"
     >
      Oggi
     </button>
    </div>

    {/* Platform filter */}
    <div className="flex gap-1">
     {PIATTAFORME.map((p) => (
      <button
       key={p.value}
       onClick={() => setPiattaforma(p.value)}
       className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        piattaforma === p.value
         ? "bg-brown text-white"
         : "border border-border bg-card text-muted-foreground hover:bg-cream-dark hover:text-brown"
       }`}
      >
       {p.label}
      </button>
     ))}
    </div>
   </div>

   {/* Calendar Grid */}
   <div className="rounded-lg border border-border bg-card overflow-hidden">
    {/* Week headers */}
    <div className="grid grid-cols-7 border-b border-border">
     {WEEK_DAYS.map((d) => (
      <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
       {d}
      </div>
     ))}
    </div>

    {/* Days */}
    <div className="grid grid-cols-7">
     {Array.from({ length: firstDayOffset }).map((_, i) => (
      <div key={`empty-${i}`} className="min-h-[88px] border-b border-r border-border/50 bg-cream-dark/20" />
     ))}

     {Array.from({ length: daysInMonth }).map((_, i) => {
      const day = i + 1;
      const dayPosts = postsByDay[day] || [];
      const isCurrentDay = isCurrentMonth && day === today;

      return (
       <div
        key={day}
        className={`min-h-[88px] border-b border-r border-border/50 p-1.5 ${
         isCurrentDay ? "bg-rose/5" : ""
        }`}
       >
        <div
         className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
          isCurrentDay ? "bg-rose text-white" : "text-brown"
         }`}
        >
         {day}
        </div>
        <div className="space-y-1">
         {dayPosts.slice(0, 3).map((post) => (
          <button
           key={post.id}
           onClick={() => setSelectedPost(post)}
           className={`w-full rounded px-1.5 py-0.5 text-left text-xs font-medium leading-tight truncate ${getTipoStyle(post.tipo_contenuto)} hover:opacity-80 transition-opacity`}
           title={post.titolo}
          >
           <PiattaformaIcon piattaforma={post.piattaforma} className="mr-0.5 inline h-2.5 w-2.5" />
           {post.titolo}
          </button>
         ))}
         {dayPosts.length > 3 && (
          <div className="text-xs text-muted-foreground">
           +{dayPosts.length - 3} altri
          </div>
         )}
        </div>
       </div>
      );
     })}
    </div>
   </div>

   {/* Post detail popup */}
   {selectedPost && (
    <div
     className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
     onClick={() => setSelectedPost(null)}
    >
     <div
      className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
      onClick={(e) => e.stopPropagation()}
     >
      <button
       onClick={() => setSelectedPost(null)}
       className="absolute right-4 top-4 text-muted-foreground hover:text-brown"
      >
       <X className="h-5 w-5" />
      </button>

      <div className="mb-3 flex flex-wrap gap-2">
       <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getTipoStyle(selectedPost.tipo_contenuto)}`}>
        {getTipoLabel(selectedPost.tipo_contenuto)}
       </span>
       <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">
        {selectedPost.piattaforma}
       </span>
       <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">
        {selectedPost.stato}
       </span>
      </div>

      <h3 className="mb-1 font-semibold text-brown">{selectedPost.titolo}</h3>
      <p className="mb-3 text-xs text-muted-foreground capitalize">
       {selectedPost.data_pubblicazione ? formatDateFull(selectedPost.data_pubblicazione) : "—"}
      </p>

      {selectedPost.caption && (
       <div className="mb-3">
        <p className="mb-1 text-xs font-medium text-brown">Caption</p>
        <p className="text-sm text-muted-foreground">{selectedPost.caption}</p>
       </div>
      )}

      {selectedPost.keyword && (
       <p className="text-xs text-muted-foreground">
        Keyword: <span className="font-medium">{selectedPost.keyword}</span>
       </p>
      )}

      {Array.isArray(selectedPost.hashtags) && selectedPost.hashtags.length > 0 && (
       <div className="mt-3 flex flex-wrap gap-1">
        {(selectedPost.hashtags as string[]).map((h) => (
         <span key={h} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          #{h}
         </span>
        ))}
       </div>
      )}
     </div>
    </div>
   )}
  </div>
 );
}
