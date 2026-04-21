import Link from "next/link";
import { MessageCircle, Send, Bot } from "lucide-react";

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
 const tabs = [
  { href: "/whatsapp/invio", label: "Invio manuale", icon: Send },
  { href: "/whatsapp/conversazioni", label: "Conversazioni Bot", icon: MessageCircle },
  { href: "/whatsapp/impostazioni", label: "Impostazioni Bot", icon: Bot },
 ];
 return (
  <div>
   <div className="mb-6">
    <h1 className="font-display text-3xl font-bold text-brown">WhatsApp</h1>
    <p className="mt-1 text-sm text-muted-foreground">
     Invio manuale, conversazioni AI di Marialucia, configurazione bot
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
     </Link>
    ))}
   </nav>
   {children}
  </div>
 );
}
