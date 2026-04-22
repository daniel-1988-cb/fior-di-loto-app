"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import {
  Building2,
  CalendarCog,
  Wallet,
  Users,
  FileText,
  UserCog,
  ClipboardList,
  CreditCard,
  Globe,
  Share2,
  Link2,
  ShoppingCart,
  MapPin,
  Send,
  Bot,
  Tag,
  Star,
  MessageSquare,
  Plug,
  Wrench,
  Award,
  type LucideIcon,
} from "lucide-react";

interface SettingCard {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
}

const impostazioni: SettingCard[] = [
  {
    icon: Building2,
    title: "Configurazione attività",
    description: "Anagrafica, contatti, dati fiscali e brand.",
    href: "/impostazioni/azienda",
  },
  {
    icon: CalendarCog,
    title: "Orari di apertura",
    description: "Orari standard del centro per giorno della settimana.",
    href: "/impostazioni/orari",
  },
  {
    icon: Wrench,
    title: "Azioni rapide agenda",
    description: "Personalizza le azioni mostrate cliccando su uno slot o sul bottone Aggiungi.",
    href: "/impostazioni/azioni-rapide",
  },
  {
    icon: CreditCard,
    title: "Pagamenti e fiscalità",
    description: "IVA, valuta, metodi di pagamento e policy.",
    href: "/impostazioni/pagamenti",
  },
  {
    icon: MessageSquare,
    title: "Template messaggi",
    description: "Modelli WhatsApp, email, SMS, push con variabili.",
    href: "/impostazioni/template-messaggi",
  },
  {
    icon: Users,
    title: "Clienti",
    description: "Fonti, tag e preferenze di raccolta dati.",
  },
  { icon: FileText, title: "Fatturazione", description: "Fatture elettroniche, saldo messaggi e sottoscrizioni." },
  { icon: UserCog, title: "Team", description: "Permessi, compensi, ferie e giorni liberi." },
  { icon: ClipboardList, title: "Moduli", description: "Template per consensi e questionari pre-trattamento." },
];

const presenza: SettingCard[] = [
  { icon: Globe, title: "Profilo marketplace", description: "Presentati ai nuovi clienti sul marketplace Fior di Loto." },
  { icon: MapPin, title: "Prenota con Google", description: "Ricevi prenotazioni da Google Search e Maps." },
  { icon: Share2, title: "Prenota con Facebook/Instagram", description: "Integra le pagine social per prenotazioni dirette." },
  { icon: ShoppingCart, title: "Negozio online", description: "Vendi prodotti e voucher direttamente dal tuo sito." },
  { icon: Link2, title: "Generatore di link", description: "Crea link di prenotazione e QR code condivisibili." },
];

const marketingCards: SettingCard[] = [
  { icon: Send, title: "Marketing di massa", description: "Invia email e SMS promozionali al tuo pubblico." },
  { icon: Bot, title: "Messaggi automatici", description: "Reminder, auguri e post-trattamento automatici." },
  { icon: Tag, title: "Offerte", description: "Codici sconto, offerte flash e promozioni dedicate." },
  { icon: MessageSquare, title: "Messaggi inviati", description: "Storico delle comunicazioni con le clienti." },
  { icon: Star, title: "Valutazioni e recensioni", description: "Raccogli feedback e rispondi alle recensioni." },
];

const altro: SettingCard[] = [
  {
    icon: Bot,
    title: "Assistente AI",
    description: "Carica documenti, gestisci visibilità e rivedi i log delle query.",
    href: "/impostazioni/assistente",
  },
  {
    icon: Award,
    title: "Programma fedeltà",
    description: "Configura punti, premi, soglie tier e bonus.",
    href: "/impostazioni/fidelizzazione",
  },
  { icon: Plug, title: "Componenti aggiuntivi", description: "AI, insights, data connector, plugin premium." },
  { icon: Wrench, title: "Integrazioni", description: "Connetti strumenti terzi (Meta, WhatsApp, Google)." },
];

function SettingCardGrid({ items }: { items: SettingCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        const card = (
          <Card className="h-full cursor-pointer transition-colors hover:border-foreground/20">
            <CardContent className="p-5">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        );
        return item.href ? (
          <Link key={item.title} href={item.href} className="block h-full">
            {card}
          </Link>
        ) : (
          <div key={item.title}>{card}</div>
        );
      })}
    </div>
  );
}

export default function V2ImpostazioniPage() {
  const [tab, setTab] = useState("impostazioni");

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Impostazioni dello spazio di lavoro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestisci tutte le preferenze di Fior di Loto Centro Estetico e Benessere.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="impostazioni">Impostazioni</TabsTrigger>
          <TabsTrigger value="presenza">Presenza online</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="altro">Altro</TabsTrigger>
        </TabsList>
        <TabsContent value="impostazioni">
          <SettingCardGrid items={impostazioni} />
        </TabsContent>
        <TabsContent value="presenza">
          <SettingCardGrid items={presenza} />
        </TabsContent>
        <TabsContent value="marketing">
          <SettingCardGrid items={marketingCards} />
        </TabsContent>
        <TabsContent value="altro">
          <SettingCardGrid items={altro} />
        </TabsContent>
      </Tabs>
    </>
  );
}
