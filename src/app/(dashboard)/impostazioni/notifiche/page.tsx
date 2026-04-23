import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";
import { PushToggle } from "@/components/pwa/push-toggle";

export default function NotifichePage() {
 return (
  <div className="mx-auto max-w-2xl">
   <div className="mb-4">
    <Link
     href="/impostazioni"
     className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
     <ArrowLeft className="h-4 w-4" />
     Impostazioni
    </Link>
   </div>

   <div className="mb-6 flex items-center gap-2">
    <div className="rounded-full bg-gradient-to-br from-rose/80 to-rose p-2 text-white">
     <Bell className="h-5 w-5" />
    </div>
    <h1 className="text-3xl font-bold tracking-tight">Notifiche push</h1>
   </div>

   <p className="mb-6 text-sm text-muted-foreground">
    Ricevi notifiche sul telefono/desktop quando il bot Marialucia riceve
    una nuova richiesta di prenotazione o un cliente scrive un messaggio
    importante. Funziona solo se installi il gestionale come app (PWA)
    dalla Home Screen.
   </p>

   <div className="rounded-xl border border-border bg-card p-6">
    <h2 className="mb-2 font-semibold text-foreground">
     Abilita su questo dispositivo
    </h2>
    <p className="mb-4 text-sm text-muted-foreground">
     Il permesso è per dispositivo — se usi l&apos;app da più telefoni o
     dal desktop, attiva le notifiche su ognuno separatamente.
    </p>
    <PushToggle />
   </div>

   <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
    <p className="font-medium text-foreground">Quali notifiche riceverò?</p>
    <ul className="mt-2 list-inside list-disc space-y-1">
     <li>Nuova richiesta di prenotazione dal bot WhatsApp</li>
     <li>Nuovo messaggio su un thread escalation a Laura</li>
     <li>Promemoria appuntamenti di domani (sintesi serale)</li>
    </ul>
   </div>

   <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
    <p className="font-medium text-amber-800 dark:text-amber-300">iPhone / iPad</p>
    <p className="mt-1 text-amber-700 dark:text-amber-400">
     Le push su iOS richiedono iOS 16.4+ <strong>e</strong> che l&apos;app
     sia stata installata come PWA (Safari → Condividi → Aggiungi a Home
     Screen). Da Safari browser normale non funzionano.
    </p>
   </div>
  </div>
 );
}
