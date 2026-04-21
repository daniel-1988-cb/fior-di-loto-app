import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { getBotThreads } from "@/lib/actions/bot-conversations";
import { AutoRefresh } from "@/components/whatsapp/auto-refresh";
import { LiveIndicator } from "@/components/whatsapp/live-indicator";

export default async function ConversazioniPage() {
 const threads = await getBotThreads();

 return (
  <div>
   <AutoRefresh intervalMs={5000} />
   <div className="mb-4 flex items-center justify-between">
    <span className="text-xs text-muted-foreground">
     {threads.length} {threads.length === 1 ? "conversazione" : "conversazioni"}
    </span>
    <LiveIndicator />
   </div>

   {threads.length === 0 ? (
    <div className="rounded-lg border border-border bg-card p-8 text-center">
     <p className="text-sm text-muted-foreground">
      Nessuna conversazione. Le chat con Marialucia appariranno qui.
     </p>
    </div>
   ) : (
    <div className="space-y-2">
     {threads.map((t) => (
      <Link
       key={t.clientId}
       href={`/whatsapp/conversazioni/${t.clientId}`}
       className="block rounded-lg border border-border bg-card p-4 hover:border-rose/40"
      >
       <div className="flex items-center justify-between">
        <div>
         <p className="font-medium text-brown">{t.clientName}</p>
         <p className="text-xs text-muted-foreground">{t.clientPhone ?? "Senza numero"}</p>
        </div>
        <div className="text-right">
         {t.unreadCount > 0 && (
          <span className="mr-2 rounded-full bg-rose px-2 py-0.5 text-xs text-white">
           {t.unreadCount}
          </span>
         )}
         {t.status === "escalated" && (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
           Escalation
          </span>
         )}
         <p className="mt-1 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(t.lastMessageAt), { addSuffix: true, locale: it })}
         </p>
        </div>
       </div>
       {t.lastPreview && (
        <p className="mt-2 truncate text-sm text-muted-foreground">{t.lastPreview}</p>
       )}
      </Link>
     ))}
    </div>
   )}
  </div>
 );
}
