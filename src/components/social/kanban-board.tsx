"use client";

import { useState, useTransition } from "react";
import { Trash2, ChevronDown } from "lucide-react";
import { updateSocialPostStatus, deleteSocialPost } from "@/lib/actions/social";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/lib/hooks/use-confirm";
import type { SocialPost } from "@/app/(dashboard)/social/page";
import { getTipoStyle, getTipoLabel, PiattaformaIcon, getPiattaformaBadgeStyle } from "@/app/(dashboard)/social/page";

const STATI = [
 { value: "bozza", label: "Bozza" },
 { value: "programmato", label: "Programmato" },
 { value: "pubblicato", label: "Pubblicato" },
 { value: "archiviato", label: "Archiviato" },
];

function formatDate(dateStr: string) {
 return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(
  new Date(dateStr + "T00:00:00")
 );
}

function PostCard({ post }: { post: SocialPost }) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();
 const [showStatusMenu, setShowStatusMenu] = useState(false);
 const confirm = useConfirm();

 function handleStatusChange(newStato: string) {
  setShowStatusMenu(false);
  startTransition(async () => {
   await updateSocialPostStatus(post.id, newStato);
   router.refresh();
  });
 }

 async function handleDelete() {
  const ok = await confirm({ title: `Eliminare il post "${post.titolo}"?`, confirmLabel: "Elimina", variant: "destructive" });
  if (!ok) return;
  startTransition(async () => {
   await deleteSocialPost(post.id);
   router.refresh();
  });
 }

 return (
  <div className={`rounded-lg border border-border bg-card p-4 transition-opacity ${isPending ? "opacity-50" : ""}`}>
   {/* Platform + Type badges */}
   <div className="mb-3 flex items-center gap-2 flex-wrap">
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getPiattaformaBadgeStyle(post.piattaforma)}`}>
     <PiattaformaIcon piattaforma={post.piattaforma} className="h-3 w-3" />
     {post.piattaforma.charAt(0).toUpperCase() + post.piattaforma.slice(1)}
    </span>
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getTipoStyle(post.tipo_contenuto)}`}>
     {getTipoLabel(post.tipo_contenuto)}
    </span>
   </div>

   {/* Title */}
   <p className="mb-1 text-sm font-medium text-brown leading-snug line-clamp-2">
    {post.titolo}
   </p>

   {/* Caption preview */}
   {post.caption && (
    <p className="mb-2 text-xs text-muted-foreground line-clamp-2">
     {post.caption}
    </p>
   )}

   {/* Date */}
   <p className="mb-3 text-xs text-muted-foreground">
    {post.data_pubblicazione ? formatDate(post.data_pubblicazione) : "—"}
   </p>

   {/* Actions */}
   <div className="flex items-center gap-2">
    {/* Status dropdown */}
    <div className="relative flex-1">
     <button
      onClick={() => setShowStatusMenu((v) => !v)}
      className="inline-flex w-full items-center justify-between gap-1 rounded-lg border border-border bg-cream-dark/40 px-2.5 py-1.5 text-xs font-medium text-brown hover:bg-cream-dark"
     >
      Sposta...
      <ChevronDown className="h-3 w-3" />
     </button>
     {showStatusMenu && (
      <div className="absolute bottom-full left-0 z-20 mb-1 w-full rounded-lg border border-border bg-card shadow-lg">
       {STATI.filter((s) => s.value !== post.stato).map((s) => (
        <button
         key={s.value}
         onClick={() => handleStatusChange(s.value)}
         className="block w-full px-3 py-1.5 text-left text-xs text-brown hover:bg-cream-dark"
        >
         {s.label}
        </button>
       ))}
      </div>
     )}
    </div>

    {/* Delete */}
    <button
     onClick={handleDelete}
     className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-red-300 hover:bg-red-50 hover:text-red-600"
     title="Elimina post"
    >
     <Trash2 className="h-3.5 w-3.5" />
    </button>
   </div>
  </div>
 );
}

type Column = {
 id: string;
 label: string;
 headerClass: string;
 count: number;
 posts: SocialPost[];
};

export function KanbanBoard({
 bozze,
 programmati,
 pubblicati,
 archiviati,
}: {
 bozze: SocialPost[];
 programmati: SocialPost[];
 pubblicati: SocialPost[];
 archiviati: SocialPost[];
}) {
 const columns: Column[] = [
  {
   id: "bozza",
   label: "Bozza",
   headerClass: "bg-muted text-muted-foreground",
   count: bozze.length,
   posts: bozze,
  },
  {
   id: "programmato",
   label: "Programmato",
   headerClass: "bg-info/10 text-info",
   count: programmati.length,
   posts: programmati,
  },
  {
   id: "pubblicato",
   label: "Pubblicato",
   headerClass: "bg-success/10 text-success",
   count: pubblicati.length,
   posts: pubblicati,
  },
  {
   id: "archiviato",
   label: "Archiviato",
   headerClass: "bg-muted/60 text-muted-foreground",
   count: archiviati.length,
   posts: archiviati,
  },
 ];

 return (
  <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
   <div className="flex gap-4 sm:grid sm:grid-cols-2 xl:grid-cols-4" style={{ minWidth: "min(100%, 56rem)" }}>
   {columns.map((col) => (
    <div key={col.id} className="flex w-[72vw] flex-none flex-col gap-3 sm:w-auto">
     {/* Column header */}
     <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${col.headerClass}`}>
      <span className="text-sm font-semibold">{col.label}</span>
      <span className="rounded-full bg-card/40 px-2 py-0.5 text-xs font-semibold">
       {col.count}
      </span>
     </div>

     {/* Cards */}
     <div className="flex flex-col gap-3">
      {col.posts.length === 0 ? (
       <div className="rounded-xl border border-dashed border-border bg-card/50 p-4 text-center text-xs text-muted-foreground">
        Nessun post
       </div>
      ) : (
       col.posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
     </div>
    </div>
   ))}
   </div>
  </div>
 );
}
