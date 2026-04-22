export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Avatar,
  Button,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from "@/components/ui";
import {
  Award,
  Gift,
  Users,
  Sparkles,
  Settings as SettingsIcon,
  AlertCircle,
} from "lucide-react";
import {
  getLoyaltySettings,
  getTopLoyalClients,
  getTierDistribution,
  getRecentRedemptions,
  getActiveMembersCount,
  getTotalPointsIssued,
  getRewards,
} from "@/lib/actions/loyalty";
import { createAdminClient } from "@/lib/supabase/admin";
import RedeemClient from "./redeem-client";

const TIER_LABEL: Record<string, string> = {
  base: "Base",
  silver: "Silver",
  gold: "Gold",
  vip: "VIP",
};

const TIER_VARIANT: Record<string, "default" | "primary" | "success" | "warning" | "danger" | "outline"> = {
  base: "outline",
  silver: "default",
  gold: "warning",
  vip: "primary",
};

export default async function V2FidelizzazionePage() {
  const supabase = createAdminClient();
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString();

  const [
    settings,
    topClients,
    tierDist,
    recentRedemptions,
    activeMembers,
    totalIssued,
    rewards,
    redemptionsMonthRes,
    clientsWithPointsRes,
  ] = await Promise.all([
    getLoyaltySettings(),
    getTopLoyalClients(10),
    getTierDistribution(),
    getRecentRedemptions(10),
    getActiveMembersCount(),
    getTotalPointsIssued(),
    getRewards(true),
    supabase
      .from("loyalty_transactions")
      .select("*", { count: "exact", head: true })
      .eq("tipo", "riscattati")
      .gte("created_at", monthStart),
    supabase
      .from("clients")
      .select("id, nome, cognome, punti, tier")
      .gt("punti", 0)
      .order("punti", { ascending: false })
      .limit(200),
  ]);

  const redemptionsThisMonth = redemptionsMonthRes.count ?? 0;
  const clientsWithPoints = (clientsWithPointsRes.data ?? []) as Array<{
    id: string;
    nome: string | null;
    cognome: string | null;
    punti: number | null;
    tier: string | null;
  }>;

  const attivo = settings?.attivo ?? false;
  const totalTier =
    tierDist.base + tierDist.silver + tierDist.gold + tierDist.vip;

  return (
    <>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Fidelizzazione del cliente
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Premia le clienti fedeli con un programma punti personalizzato.
          </p>
        </div>
        <Link href="/impostazioni/fidelizzazione">
          <Button variant="outline">
            <SettingsIcon className="h-4 w-4" /> Impostazioni
          </Button>
        </Link>
      </header>

      {!attivo && (
        <Card className="mb-6 border-warning/40 bg-warning/5">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-full bg-warning/15 p-2 text-warning">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Programma fedeltà disattivato</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Abilitalo nelle impostazioni per iniziare ad assegnare punti
                automaticamente.
              </p>
            </div>
            <Link href="/impostazioni/fidelizzazione">
              <Button variant="outline" size="sm">
                Vai alle impostazioni
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Programma attivo
          </p>
          <div className="mt-2">
            {attivo ? (
              <Badge variant="success">Sì</Badge>
            ) : (
              <Badge variant="danger">No</Badge>
            )}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Membri attivi
          </p>
          <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold">
            <Users className="h-5 w-5 text-muted-foreground" />
            {activeMembers}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Punti emessi
          </p>
          <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            {totalIssued.toLocaleString("it-IT")}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Riscatti mese
          </p>
          <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold">
            <Gift className="h-5 w-5 text-muted-foreground" />
            {redemptionsThisMonth.toLocaleString("it-IT")}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Premi disponibili
          </p>
          <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold">
            <Gift className="h-5 w-5 text-muted-foreground" />
            {rewards.length}
          </p>
        </Card>
      </section>

      {/* Top clients + tier distribution */}
      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-primary" /> Top clienti fedeli
            </CardTitle>
            <CardDescription>
              Le 10 clienti con più punti accumulati.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {topClients.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                Nessuna cliente con punti accumulati.
              </p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Cliente</TH>
                    <TH>Tier</TH>
                    <TH className="text-right">Punti</TH>
                    <TH className="text-right">Visite</TH>
                  </TR>
                </THead>
                <TBody>
                  {topClients.map((c) => {
                    const fullName = `${c.nome ?? ""} ${c.cognome ?? ""}`.trim();
                    const tier = (c.tier as string) || "base";
                    return (
                      <TR key={c.id}>
                        <TD>
                          <div className="flex items-center gap-3">
                            <Avatar size="sm" name={fullName} />
                            <Link
                              href={`/clienti/${c.id}`}
                              className="font-medium hover:underline"
                            >
                              {fullName || "—"}
                            </Link>
                          </div>
                        </TD>
                        <TD>
                          <Badge variant={TIER_VARIANT[tier] ?? "outline"}>
                            {TIER_LABEL[tier] ?? tier}
                          </Badge>
                        </TD>
                        <TD className="text-right font-semibold">
                          {Number(c.punti ?? 0).toLocaleString("it-IT")}
                        </TD>
                        <TD className="text-right text-muted-foreground">
                          {c.totale_visite ?? 0}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" /> Distribuzione tier
            </CardTitle>
            <CardDescription>
              {totalTier.toLocaleString("it-IT")} clienti totali.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["base", "silver", "gold", "vip"] as const).map((tier) => {
              const count = tierDist[tier];
              const pct = totalTier > 0 ? (count / totalTier) * 100 : 0;
              return (
                <div key={tier}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={TIER_VARIANT[tier] ?? "outline"}>
                        {TIER_LABEL[tier]}
                      </Badge>
                      <span className="text-muted-foreground">
                        {count.toLocaleString("it-IT")} clienti
                      </span>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      {/* Per-client redeem management */}
      <section className="mb-6">
        <RedeemClient
          clients={clientsWithPoints}
          rewards={rewards.map((r) => ({
            id: r.id,
            nome: r.nome,
            costo_punti: r.costo_punti,
            attivo: r.attivo,
          }))}
        />
      </section>

      {/* Recent redemptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-primary" /> Premi più richiesti
          </CardTitle>
          <CardDescription>Ultimi riscatti registrati.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recentRedemptions.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              Nessun riscatto registrato finora.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Cliente</TH>
                  <TH>Premio</TH>
                  <TH className="text-right">Punti spesi</TH>
                  <TH className="text-right">Data</TH>
                </TR>
              </THead>
              <TBody>
                {recentRedemptions.map((r) => {
                  const client = Array.isArray(r.clients)
                    ? r.clients[0]
                    : r.clients;
                  const reward = Array.isArray(r.loyalty_rewards)
                    ? r.loyalty_rewards[0]
                    : r.loyalty_rewards;
                  const fullName = client
                    ? `${client.nome ?? ""} ${client.cognome ?? ""}`.trim()
                    : "—";
                  return (
                    <TR key={r.id}>
                      <TD>
                        {r.client_id ? (
                          <Link
                            href={`/clienti/${r.client_id}`}
                            className="hover:underline"
                          >
                            {fullName || "—"}
                          </Link>
                        ) : (
                          fullName || "—"
                        )}
                      </TD>
                      <TD className="text-muted-foreground">
                        {reward?.nome ?? r.descrizione ?? "—"}
                      </TD>
                      <TD className="text-right font-semibold text-danger">
                        {Number(r.punti ?? 0).toLocaleString("it-IT")}
                      </TD>
                      <TD className="text-right text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("it-IT")}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
