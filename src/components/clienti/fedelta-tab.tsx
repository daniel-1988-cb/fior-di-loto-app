import { Sparkles } from "lucide-react";
import type { LoyaltyTransaction } from "@/lib/actions/loyalty";

type Props = {
  punti: number;
  tier: string;
  transactions: LoyaltyTransaction[];
};

const TIER_LABEL: Record<string, string> = {
  base: "Base",
  silver: "Silver",
  gold: "Gold",
  vip: "VIP",
};

const TIER_COLOR: Record<string, string> = {
  base: "bg-muted text-muted-foreground",
  silver: "bg-slate-200 text-slate-700",
  gold: "bg-gold/20 text-gold-dark",
  vip: "bg-rose/20 text-rose-dark",
};

const TIPO_LABEL: Record<string, string> = {
  guadagnati: "Guadagnati",
  riscattati: "Riscattati",
  aggiustamento: "Aggiustamento",
  bonus: "Bonus",
  scaduti: "Scaduti",
};

export function FedeltaTab({ punti, tier, transactions }: Props) {
  const tierLabel = TIER_LABEL[tier] || tier;
  const tierColor = TIER_COLOR[tier] || TIER_COLOR.base;
  const recent = transactions.slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Punti fedeltà
            </p>
            <p className="mt-1 flex items-center gap-2 text-3xl font-semibold text-brown">
              <Sparkles className="h-6 w-6 text-rose" />
              {punti.toLocaleString("it-IT")}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${tierColor}`}
          >
            Tier: {tierLabel}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h3 className="font-semibold text-brown">
            Transazioni{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({recent.length})
            </span>
          </h3>
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nessuna transazione registrata.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Data</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 text-right font-medium">Punti</th>
                  <th className="px-4 py-2 font-medium">Descrizione</th>
                  <th className="px-4 py-2 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((t) => {
                  const date = t.created_at
                    ? new Date(t.created_at).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "—";
                  const isPositive = t.punti > 0;
                  return (
                    <tr key={t.id}>
                      <td className="px-4 py-2 text-muted-foreground">{date}</td>
                      <td className="px-4 py-2 text-brown">
                        {TIPO_LABEL[t.tipo] || t.tipo}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-semibold ${
                          isPositive ? "text-success" : "text-destructive"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {t.punti}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {t.descrizione || "—"}
                      </td>
                      <td className="px-4 py-2 text-right text-brown">
                        {t.saldo_dopo ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
