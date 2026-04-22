"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { Gift, Check } from "lucide-react";
import { redeemReward } from "@/lib/actions/loyalty";

type Client = {
  id: string;
  nome: string | null;
  cognome: string | null;
  punti: number | null;
  tier: string | null;
};

type Reward = {
  id: string;
  nome: string;
  costo_punti: number;
  attivo: boolean;
};

const TIER_VARIANT: Record<
  string,
  "default" | "primary" | "success" | "warning" | "danger" | "outline"
> = {
  base: "outline",
  silver: "default",
  gold: "warning",
  vip: "primary",
};

const TIER_LABEL: Record<string, string> = {
  base: "Base",
  silver: "Silver",
  gold: "Gold",
  vip: "VIP",
};

export default function RedeemClient({
  clients,
  rewards,
}: {
  clients: Client[];
  rewards: Reward[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [selectedRewardByClient, setSelectedRewardByClient] = useState<
    Record<string, string>
  >({});

  const activeRewards = useMemo(
    () => rewards.filter((r) => r.attivo).sort((a, b) => a.costo_punti - b.costo_punti),
    [rewards]
  );

  // Minimum reward cost = prossima soglia raggiungibile (premio più economico).
  const minRewardCost = activeRewards[0]?.costo_punti ?? 0;

  function nextThreshold(puntiCorrenti: number): { cost: number; label: string } | null {
    const next = activeRewards.find((r) => r.costo_punti > puntiCorrenti);
    if (next) return { cost: next.costo_punti, label: next.nome };
    return null;
  }

  function cheapestReachable(puntiCorrenti: number): Reward | null {
    return (
      activeRewards.find((r) => r.costo_punti <= puntiCorrenti) ?? null
    );
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleRedeem(clientId: string) {
    const rewardId = selectedRewardByClient[clientId] ?? cheapestReachable(
      clients.find((c) => c.id === clientId)?.punti ?? 0
    )?.id;
    if (!rewardId) {
      showToast("Nessun premio disponibile o configurato.");
      return;
    }
    const client = clients.find((c) => c.id === clientId);
    const reward = activeRewards.find((r) => r.id === rewardId);
    if (!client || !reward) return;
    if (
      !window.confirm(
        `Riscuotere "${reward.nome}" (-${reward.costo_punti} punti) per ${client.nome} ${client.cognome}?`
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await redeemReward(clientId, rewardId);
        showToast(`Premio "${reward.nome}" riscosso.`);
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Riscatto fallito";
        showToast(`Errore: ${msg}`);
      }
    });
  }

  if (activeRewards.length === 0) {
    return (
      <Card className="border-warning/40 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-warning" /> Nessun premio configurato
          </CardTitle>
          <CardDescription>
            Configura i premi in{" "}
            <Link
              href="/impostazioni/fidelizzazione"
              className="underline hover:text-foreground"
            >
              Impostazioni fedeltà
            </Link>{" "}
            per iniziare a gestire i riscatti delle tue clienti.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-primary" /> Gestione riscatti premi
          </CardTitle>
          <CardDescription>
            Clienti con almeno 1 punto · scegli il premio e registra il riscatto.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              Nessuna cliente con punti accumulati.
            </p>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium">Tier</th>
                    <th className="px-4 py-3 text-right font-medium">Punti</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Prossimo premio
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Premio</th>
                    <th className="px-4 py-3 text-right font-medium">Azione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clients.map((c) => {
                    const fullName = `${c.nome ?? ""} ${c.cognome ?? ""}`.trim();
                    const tier = (c.tier as string) || "base";
                    const punti = Number(c.punti ?? 0);
                    const next = nextThreshold(punti);
                    const reachable = cheapestReachable(punti);
                    const canRedeem = punti >= minRewardCost && !!reachable;
                    const selected =
                      selectedRewardByClient[c.id] ?? reachable?.id ?? "";
                    return (
                      <tr
                        key={c.id}
                        className="transition-colors hover:bg-muted/40"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar size="sm" name={fullName} />
                            <Link
                              href={`/clienti/${c.id}`}
                              className="font-medium hover:underline"
                            >
                              {fullName || "—"}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={TIER_VARIANT[tier] ?? "outline"}>
                            {TIER_LABEL[tier] ?? tier}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {punti.toLocaleString("it-IT")}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {next ? (
                            <span>
                              -{(next.cost - punti).toLocaleString("it-IT")} pt per{" "}
                              <span className="font-medium">{next.label}</span>
                            </span>
                          ) : (
                            <span className="text-success">
                              Tutti i premi sbloccati
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {canRedeem ? (
                            <select
                              value={selected}
                              onChange={(e) =>
                                setSelectedRewardByClient((prev) => ({
                                  ...prev,
                                  [c.id]: e.target.value,
                                }))
                              }
                              className="h-8 rounded-md border border-border bg-card px-2 text-xs"
                            >
                              {activeRewards
                                .filter((r) => r.costo_punti <= punti)
                                .map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.nome} ({r.costo_punti}pt)
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant={canRedeem ? "primary" : "outline"}
                            onClick={() => handleRedeem(c.id)}
                            disabled={!canRedeem || pending}
                          >
                            <Gift className="h-3.5 w-3.5" />
                            Riscuoti
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {toast && (
        <div className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-lg">
          <Check className="h-4 w-4 text-success" />
          {toast}
        </div>
      )}
    </>
  );
}
