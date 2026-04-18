export const dynamic = "force-dynamic";

import Link from "next/link";
import { reportsSubNav } from "@/components/layout/v2-sidenav";
import { Card, CardContent, Input, Badge, Tabs, TabsList, TabsTrigger } from "@/components/ui";
import { BarChart3, Search, Star } from "lucide-react";

interface Report {
  key: string;
  nome: string;
  descrizione: string;
  categoria: string;
  tipo: "dashboard" | "standard" | "premium" | "custom";
  favorite?: boolean;
}

const reports: Report[] = [
  {
    key: "rendimento",
    nome: "Dashboard del rendimento",
    descrizione: "Fatturato, appuntamenti e top staff aggregati del mese.",
    categoria: "Vendite",
    tipo: "dashboard",
    favorite: true,
  },
  {
    key: "online",
    nome: "Dashboard attività online",
    descrizione: "Prenotazioni online e vendite dai canali digitali.",
    categoria: "Appuntamenti",
    tipo: "dashboard",
  },
  {
    key: "fedelta",
    nome: "Dashboard fedeltà",
    descrizione: "Punti accumulati e premi riscattati.",
    categoria: "Clienti",
    tipo: "dashboard",
  },
  {
    key: "vendite-mese",
    nome: "Riepilogo vendite mensile",
    descrizione: "Entrate per servizio, prodotto, voucher e abbonamento.",
    categoria: "Vendite",
    tipo: "standard",
  },
  {
    key: "finanze-mese",
    nome: "Saldo finanziario",
    descrizione: "Entrate vs uscite con classificazione per categoria.",
    categoria: "Finanze",
    tipo: "standard",
  },
  {
    key: "staff-performance",
    nome: "Performance team",
    descrizione: "Appuntamenti e fatturato per operatrice.",
    categoria: "Team",
    tipo: "standard",
  },
  {
    key: "top-servizi",
    nome: "Servizi più richiesti",
    descrizione: "Top servizi per numero e fatturato.",
    categoria: "Vendite",
    tipo: "standard",
  },
  {
    key: "clienti-segmenti",
    nome: "Segmenti clienti",
    descrizione: "Distribuzione dei clienti per segmento automatico.",
    categoria: "Clienti",
    tipo: "standard",
  },
  {
    key: "stock",
    nome: "Rotazione stock",
    descrizione: "Movimenti di magazzino e prodotti esauriti.",
    categoria: "Inventario",
    tipo: "standard",
  },
  {
    key: "no-show",
    nome: "Tasso di no-show",
    descrizione: "Appuntamenti non onorati per operatrice e servizio.",
    categoria: "Appuntamenti",
    tipo: "premium",
  },
  {
    key: "cohort",
    nome: "Analisi cohort",
    descrizione: "Comportamento di acquisto per coorte di nuove clienti.",
    categoria: "Clienti",
    tipo: "premium",
  },
  {
    key: "voucher-performance",
    nome: "Performance voucher",
    descrizione: "Vendite e riscatti voucher nel tempo.",
    categoria: "Vendite",
    tipo: "standard",
  },
];

const CATEGORIE = ["Tutti", "Vendite", "Finanze", "Appuntamenti", "Team", "Clienti", "Inventario"];

export default function V2ReportsPage() {
  const bySection = {
    dashboard: reports.filter((r) => r.tipo === "dashboard"),
    standard: reports.filter((r) => r.tipo === "standard"),
    premium: reports.filter((r) => r.tipo === "premium"),
    favorites: reports.filter((r) => r.favorite),
  };

  const subNavWithCounts = [
    {
      items: [
        { href: "/reports", label: "Tutti i report", badge: reports.length },
        { href: "/reports/preferiti", label: "Preferiti", badge: bySection.favorites.length },
        { href: "/reports/dashboard", label: "Dashboard", badge: bySection.dashboard.length },
        { href: "/reports/standard", label: "Standard", badge: bySection.standard.length },
        { href: "/reports/premium", label: "Premium", badge: bySection.premium.length },
        { href: "/reports/custom", label: "Personalizzabile", badge: 0 },
        { href: "/reports/goals", label: "Obiettivi" },
      ],
    },
    {
      title: "Cartelle",
      items: [{ href: "/reports/data-connector", label: "Data connector" }],
    },
  ];

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Report e statistiche</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {reports.length} report disponibili. Monitora ogni aspetto dell&apos;attività.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cerca per nome o descrizione" className="pl-9" />
        </div>
        <Tabs defaultValue="Tutti">
          <TabsList>
            {CATEGORIE.map((c) => (
              <TabsTrigger key={c} value={c}>
                {c}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-3">
        {reports.map((r) => (
          <Link key={r.key} href={`/reports/${r.key}`}>
            <Card className="p-4 transition-colors hover:bg-muted/30">
              <CardContent className="p-0">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3 text-primary">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{r.nome}</h3>
                      {r.tipo === "premium" && <Badge variant="primary">Premium</Badge>}
                      {r.favorite && <Star className="h-3.5 w-3.5 fill-warning text-warning" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{r.descrizione}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Categoria {r.categoria} · Tipo {r.tipo}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
