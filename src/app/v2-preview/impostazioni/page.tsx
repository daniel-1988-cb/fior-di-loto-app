"use client";

import { useState } from "react";
import { V2Shell } from "@/components/layout/v2-shell";
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
  Facebook,
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
  type LucideIcon,
} from "lucide-react";

interface SettingCard {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
}

const impostazioni: SettingCard[] = [
  { icon: Building2, title: "Configurazione dell'attività", description: "Personalizza dettagli azienda e gestisci le sedi." },
  { icon: CalendarCog, title: "Pianificazione", description: "Orari di apertura, risorse prenotabili, regole di prenotazione." },
  { icon: Wallet, title: "Vendite", description: "Metodi di pagamento, tasse, ricevute e commissioni." },
  { icon: Users, title: "Clienti", description: "Fonti, tag e preferenze di raccolta dati." },
  { icon: FileText, title: "Fatturazione", description: "Fatture elettroniche, saldo messaggi e sottoscrizioni." },
  { icon: UserCog, title: "Team", description: "Permessi, compensi, ferie e giorni liberi." },
  { icon: ClipboardList, title: "Moduli", description: "Template per consensi e questionari pre-trattamento." },
  { icon: CreditCard, title: "Pagamenti", description: "POS, metodi di pagamento, policy di cancellazione." },
];

const presenza: SettingCard[] = [
  { icon: Globe, title: "Profilo marketplace", description: "Presentati ai nuovi clienti sul marketplace Fior di Loto." },
  { icon: MapPin, title: "Prenota con Google", description: "Ricevi prenotazioni da Google Search e Maps." },
  { icon: Facebook, title: "Prenota con Facebook/Instagram", description: "Integra le pagine social per prenotazioni dirette." },
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
  { icon: Plug, title: "Componenti aggiuntivi", description: "AI, insights, data connector, plugin premium." },
  { icon: Wrench, title: "Integrazioni", description: "Connetti strumenti terzi (Meta, WhatsApp, Google)." },
];

function SettingCardGrid({ items }: { items: SettingCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.title}
            className="cursor-pointer transition-colors hover:border-foreground/20"
          >
            <CardContent className="p-5">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function V2ImpostazioniPage() {
  const [tab, setTab] = useState("impostazioni");

  return (
    <V2Shell>
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
    </V2Shell>
  );
}
