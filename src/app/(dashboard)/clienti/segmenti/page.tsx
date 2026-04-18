export const dynamic = "force-dynamic";

import Link from "next/link";
import { clientiSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { UserPlus, Users, Star, CalendarClock, UserX, Crown, Gift, Cake } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LucideIcon } from "lucide-react";

interface Segment {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  query: (client: import("@/types/database").TableRow<"clients">) => boolean;
}

const segments: Segment[] = [
  {
    key: "nuovi",
    label: "Nuovi clienti",
    description: "Inseriti negli ultimi 30 giorni",
    icon: UserPlus,
    query: (c) => {
      const d = new Date(c.created_at);
      const diff = (Date.now() - d.getTime()) / 86_400_000;
      return diff <= 30;
    },
  },
  {
    key: "recenti",
    label: "Clienti recenti",
    description: "Visita negli ultimi 30 giorni",
    icon: CalendarClock,
    query: (c) => {
      if (!c.ultima_visita) return false;
      const d = new Date(c.ultima_visita);
      const diff = (Date.now() - d.getTime()) / 86_400_000;
      return diff <= 30;
    },
  },
  {
    key: "primo",
    label: "Primo appuntamento",
    description: "Clienti senza storico ma con un appuntamento programmato",
    icon: Star,
    query: (c) => (c.totale_visite ?? 0) === 0,
  },
  {
    key: "fedeli",
    label: "Clienti fedeli",
    description: "Almeno 5 visite negli ultimi mesi",
    icon: Crown,
    query: (c) => (c.totale_visite ?? 0) >= 5,
  },
  {
    key: "inattivi",
    label: "Clienti inattivi",
    description: "Nessuna visita da oltre 90 giorni",
    icon: UserX,
    query: (c) => {
      if (!c.ultima_visita) return false;
      const d = new Date(c.ultima_visita);
      const diff = (Date.now() - d.getTime()) / 86_400_000;
      return diff > 90;
    },
  },
  {
    key: "vip",
    label: "Clienti VIP",
    description: "Totale speso superiore a 500 €",
    icon: Gift,
    query: (c) => (c.totale_speso ?? 0) >= 500,
  },
  {
    key: "compleanni",
    label: "Compleanni del mese",
    description: "Clienti con data di nascita nel mese corrente",
    icon: Cake,
    query: (c) => {
      if (!c.data_nascita) return false;
      const d = new Date(c.data_nascita);
      return d.getMonth() === new Date().getMonth();
    },
  },
  {
    key: "tutti",
    label: "Tutti i clienti",
    description: "Ogni cliente dell'anagrafica",
    icon: Users,
    query: () => true,
  },
];

export default async function V2SegmentsPage() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("clients").select("*");
  const clients = (data ?? []) as import("@/types/database").TableRow<"clients">[];

  const counted = segments.map((s) => ({
    ...s,
    count: clients.filter(s.query).length,
  }));

  return (
    <>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suddivisioni clienti</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suddivisioni automatiche per marketing, report e calendario.
          </p>
        </div>
        <Button variant="outline">Personalizzata</Button>
      </header>

      <div className="space-y-3">
        {counted.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.key}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{s.label}</p>
                    <Badge variant="primary">{s.count}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
                <Link href={`/clienti?segmento=${s.key}`}>
                  <Button variant="outline" size="sm">
                    Attività
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
