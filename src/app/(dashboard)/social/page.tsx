export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus, Camera, Globe, Video } from "lucide-react";
import { getAllSocialPosts } from "@/lib/actions/social";
import { SocialNav } from "@/components/social/social-nav";
import { KanbanBoard } from "@/components/social/kanban-board";

export type SocialPost = {
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

export function getTipoStyle(tipo: string) {
 switch (tipo) {
  case "reel_hook": return "bg-rose/20 text-rose-dark";
  case "educational": return "bg-gold/20 text-gold-dark";
  case "prima_dopo": return "bg-success/20 text-success";
  case "connessione": return "bg-info/20 text-info";
  case "prodotto": return "bg-purple-100 text-purple-700";
  default: return "bg-muted text-muted-foreground";
 }
}

export function getTipoLabel(tipo: string) {
 switch (tipo) {
  case "reel_hook": return "Reel";
  case "educational": return "Educational";
  case "prima_dopo": return "Prima/Dopo";
  case "connessione": return "Connessione";
  case "prodotto": return "Prodotto";
  default: return tipo;
 }
}

export function PiattaformaIcon({ piattaforma, className = "h-4 w-4" }: { piattaforma: string; className?: string }) {
 switch (piattaforma) {
  case "instagram": return <Camera className={className} />;
  case "facebook": return <Globe className={className} />;
  case "tiktok": return <Video className={className} />;
  default: return <Globe className={className} />;
 }
}

export function getPiattaformaBadgeStyle(piattaforma: string) {
 switch (piattaforma) {
  case "instagram": return "bg-rose/10 text-rose";
  case "facebook": return "bg-blue-100 text-blue-700";
  case "tiktok": return "bg-gray-900 text-white";
  default: return "bg-muted text-muted-foreground";
 }
}

export default async function SocialPage() {
 const allPosts = await getAllSocialPosts() as unknown as SocialPost[];

 const bozze = allPosts.filter((p) => p.stato === "bozza");
 const programmati = allPosts.filter((p) => p.stato === "programmato");
 const pubblicati = allPosts.filter((p) => p.stato === "pubblicato");
 const archiviati = allPosts.filter((p) => p.stato === "archiviato");

 return (
  <div>
   {/* Header */}
   <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
     <h1 className="text-3xl font-bold text-brown">
      Social Media
     </h1>
     <p className="mt-1 text-sm text-muted-foreground">
      {allPosts.length} post totali — gestisci il tuo content plan
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

   <SocialNav />

   <KanbanBoard
    bozze={bozze}
    programmati={programmati}
    pubblicati={pubblicati}
    archiviati={archiviati}
   />
  </div>
 );
}
