export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  Award,
  Plus,
  Gift,
  Tag,
  Calendar,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from "@/components/ui";
import {
  getLoyaltySettings,
  getRewards,
  getRecentTransactions,
} from "@/lib/actions/loyalty";
import { SettingsForm } from "./settings-form";
import { RewardActions } from "./reward-actions";

const DEFAULT_SETTINGS = {
  id: "00000000-0000-0000-0000-000000000002",
  attivo: false,
  euro_per_punto: 1,
  soglia_silver: 100,
  soglia_gold: 300,
  soglia_vip: 800,
  punti_compleanno: 0,
  punti_referral: 0,
  scadenza_punti_giorni: null,
  updated_at: null,
} as const;

const TIPO_LABEL: Record<string, string> = {
  guadagnati: "Guadagnati",
  riscattati: "Riscattati",
  aggiustamento: "Aggiustamento",
  bonus: "Bonus",
  scaduti: "Scaduti",
};

const TIPO_VARIANT: Record<string, "default" | "primary" | "success" | "warning" | "danger" | "outline"> = {
  guadagnati: "success",
  riscattati: "danger",
  aggiustamento: "outline",
  bonus: "primary",
  scaduti: "warning",
};

const CATEGORIA_LABEL: Record<string, string> = {
  sconto: "Sconto",
  prodotto: "Prodotto",
  servizio: "Servizio",
  esperienza: "Esperienza",
  regalo: "Regalo",
};

export default async function ImpostazioniFidelizzazionePage() {
  const [settingsRow, rewards, transactions] = await Promise.all([
    getLoyaltySettings(),
    getRewards(false),
    getRecentTransactions(50),
  ]);

  const settings = settingsRow ?? { ...DEFAULT_SETTINGS };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-gradient-to-br from-primary to-secondary p-2 text-white">
              <Award className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Programma fedeltà
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Configura punti, soglie tier e catalogo premi per fidelizzare
            le clienti.
          </p>
        </div>
        <Link href="/impostazioni/fidelizzazione/nuovo-premio">
          <Button>
            <Plus className="h-4 w-4" /> Nuovo premio
          </Button>
        </Link>
      </header>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configurazione</TabsTrigger>
          <TabsTrigger value="rewards">Catalogo premi</TabsTrigger>
          <TabsTrigger value="history">Storico transazioni</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configurazione</CardTitle>
              <CardDescription>
                Definisci come vengono guadagnati i punti e quando una cliente
                cambia tier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsForm settings={settings} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards">
          {rewards.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Gift className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">
                Nessun premio in catalogo
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Aggiungi il primo premio: sconti, prodotti omaggio o
                esperienze esclusive.
              </p>
              <Link
                href="/impostazioni/fidelizzazione/nuovo-premio"
                className="mt-6 inline-block"
              >
                <Button>
                  <Plus className="h-4 w-4" /> Crea premio
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rewards.map((r) => (
                <Card key={r.id} className="flex flex-col p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.nome}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="primary">
                          {r.costo_punti.toLocaleString("it-IT")} punti
                        </Badge>
                        <Badge variant="outline">
                          <Tag className="mr-1 h-3 w-3" />
                          {CATEGORIA_LABEL[r.categoria] ?? r.categoria}
                        </Badge>
                        {!r.attivo && (
                          <Badge variant="warning">Disattivato</Badge>
                        )}
                      </div>
                    </div>
                    <RewardActions id={r.id} nome={r.nome} />
                  </div>
                  {r.descrizione && (
                    <p className="mb-3 flex-1 text-sm text-muted-foreground">
                      {r.descrizione}
                    </p>
                  )}
                  {r.scadenza_giorni && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> Validità{" "}
                      {r.scadenza_giorni} giorni
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Storico transazioni</CardTitle>
              <CardDescription>
                Ultimi 50 movimenti del programma fedeltà.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">
                  Nessuna transazione registrata.
                </p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Data</TH>
                      <TH>Cliente</TH>
                      <TH>Tipo</TH>
                      <TH className="text-right">Punti</TH>
                      <TH>Descrizione</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {transactions.map((t) => {
                      const client = Array.isArray(t.clients)
                        ? t.clients[0]
                        : t.clients;
                      const reward = Array.isArray(t.loyalty_rewards)
                        ? t.loyalty_rewards[0]
                        : t.loyalty_rewards;
                      const fullName = client
                        ? `${client.nome ?? ""} ${client.cognome ?? ""}`.trim()
                        : "—";
                      const tipo = (t.tipo as string) || "aggiustamento";
                      const punti = Number(t.punti) || 0;
                      const desc = reward?.nome
                        ? `${t.descrizione ?? ""}${
                            t.descrizione ? " · " : ""
                          }${reward.nome}`
                        : t.descrizione ?? "";
                      return (
                        <TR key={t.id}>
                          <TD className="whitespace-nowrap text-muted-foreground">
                            {new Date(t.created_at).toLocaleDateString(
                              "it-IT",
                              { day: "2-digit", month: "2-digit", year: "2-digit" }
                            )}
                          </TD>
                          <TD>
                            {t.client_id ? (
                              <Link
                                href={`/clienti/${t.client_id}`}
                                className="hover:underline"
                              >
                                {fullName || "—"}
                              </Link>
                            ) : (
                              fullName || "—"
                            )}
                          </TD>
                          <TD>
                            <Badge variant={TIPO_VARIANT[tipo] ?? "outline"}>
                              {TIPO_LABEL[tipo] ?? tipo}
                            </Badge>
                          </TD>
                          <TD
                            className={`text-right font-semibold tabular-nums ${
                              punti < 0
                                ? "text-danger"
                                : punti > 0
                                ? "text-success"
                                : ""
                            }`}
                          >
                            {punti > 0 ? "+" : ""}
                            {punti.toLocaleString("it-IT")}
                          </TD>
                          <TD className="text-muted-foreground">
                            {desc || "—"}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
