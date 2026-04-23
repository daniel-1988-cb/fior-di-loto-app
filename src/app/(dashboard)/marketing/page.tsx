export const dynamic = "force-dynamic";

import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { Send, Zap, History, Tag, Star, BadgePercent } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

async function getHubCounts() {
  const supabase = createAdminClient();
  const [camp, autom, offers, sent] = await Promise.all([
    supabase.from("campaigns").select("id, stato", { count: "exact" }).limit(1000),
    supabase.from("marketing_automations").select("id, attivo").limit(1000),
    supabase.from("offers").select("id, attivo").limit(1000),
    supabase
      .from("sent_messages")
      .select("id", { count: "exact", head: true })
      .gte("inviato_at", new Date(Date.now() - 30 * 86400 * 1000).toISOString()),
  ]);

  const campaigns = camp.data ?? [];
  const automations = autom.data ?? [];
  const offersList = offers.data ?? [];

  return {
    campaigns: {
      total: campaigns.length,
      programmate: campaigns.filter((c) => c.stato === "programmata").length,
      inviate: campaigns.filter((c) => c.stato === "inviata").length,
    },
    automations: {
      total: automations.length,
      attive: automations.filter((a) => a.attivo).length,
    },
    offers: {
      total: offersList.length,
      attive: offersList.filter((o) => o.attivo).length,
    },
    sentLast30: sent.count ?? 0,
  };
}

export default async function V2MarketingHub() {
  const c = await getHubCounts();

  const cards = [
    {
      href: "/marketing/campagne",
      icon: Send,
      title: "Campagne di massa",
      desc: "Invia offerte e aggiornamenti al tuo pubblico.",
      stat: `${c.campaigns.total} totali`,
      accent: `${c.campaigns.programmate} programmate`,
    },
    {
      href: "/marketing/automatici",
      icon: Zap,
      title: "Messaggi automatici",
      desc: "Regole che lavorano per te in background.",
      stat: `${c.automations.total} totali`,
      accent: `${c.automations.attive} attive`,
    },
    {
      href: "/marketing/cronologia",
      icon: History,
      title: "Cronologia messaggi",
      desc: "Log unificato di tutti gli invii.",
      stat: `${c.sentLast30} ultimi 30 gg`,
      accent: "",
    },
    {
      href: "/marketing/offerte",
      icon: BadgePercent,
      title: "Offerte e codici",
      desc: "Promozioni e codici sconto tracciati.",
      stat: `${c.offers.total} totali`,
      accent: `${c.offers.attive} attivi`,
    },
    {
      href: "/marketing/recensioni",
      icon: Star,
      title: "Recensioni",
      desc: "Raccogli feedback dopo ogni visita.",
      stat: "",
      accent: "In arrivo",
    },
    {
      href: "/marketing/tariffe",
      icon: Tag,
      title: "Tariffe smart",
      desc: "Listini dinamici per fasce orarie.",
      stat: "",
      accent: "In arrivo",
    },
  ];

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Marketing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Campagne, automatismi, offerte e tracciamento in un posto solo.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="block">
              <Card className="p-5 transition-colors hover:bg-muted/40">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{card.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{card.desc}</p>
                    <div className="mt-3 flex items-center gap-2">
                      {card.stat && (
                        <Badge variant="outline" className="text-xs">
                          {card.stat}
                        </Badge>
                      )}
                      {card.accent && (
                        <Badge variant="primary" className="text-xs">
                          {card.accent}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
