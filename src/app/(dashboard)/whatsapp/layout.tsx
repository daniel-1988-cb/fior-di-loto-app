import Link from "next/link";
import { MessageCircle, Send, Bot, CalendarClock } from "lucide-react";
import { getPendingAppointmentRequestsCount } from "@/lib/actions/appointment-requests";

export default async function WhatsAppLayout({ children }: { children: React.ReactNode }) {
 const pendingRequests = await getPendingAppointmentRequestsCount();
 const tabs = [
  { href: "/whatsapp/invio", label: "Invio manuale", icon: Send, badge: 0 },
  { href: "/whatsapp/conversazioni", label: "Conversazioni Bot", icon: MessageCircle, badge: 0 },
  { href: "/whatsapp/richieste", label: "Richieste prenotazione", icon: CalendarClock, badge: pendingRequests },
  { href: "/whatsapp/impostazioni", label: "Impostazioni Bot", icon: Bot, badge: 0 },
 ];
 return (
  <div>
   <div className="mb-6">
    <h1 className="font-display text-3xl font-bold text-brown">WhatsApp</h1>
    <p className="mt-1 text-sm text-muted-foreground">
     Invio manuale, conversazioni AI di Marialucia, richieste di prenotazione, configurazione bot
    </p>
   </div>
   <nav className="mb-6 flex gap-2 border-b border-border">
    {tabs.map((t) => (
     <Link
      key={t.href}
      href={t.href}
      className="inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-rose hover:text-rose"
     >
      <t.icon className="h-4 w-4" />
      {t.label}
      {t.badge > 0 && (
       <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
        {t.badge}
       </span>
      )}
     </Link>
    ))}
   </nav>
   {children}
  </div>
 );
}
