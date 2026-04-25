"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Plus, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  WALLET_TIPO_LABEL,
  WALLET_TIPI_POSITIVI,
  VALID_WALLET_TIPI,
  type WalletTipo,
  type WalletTransaction,
} from "@/lib/types/client-wallet";
import { addWalletTransaction } from "@/lib/actions/client-wallet";

type Props = {
  clientId: string;
  balance: number;
  transactions: WalletTransaction[];
};

const TIPO_BADGE_COLOR: Record<WalletTipo, string> = {
  ricarica: "bg-success/15 text-success",
  utilizzo: "bg-destructive/15 text-destructive",
  rimborso: "bg-info/15 text-info",
  aggiustamento: "bg-warning/15 text-warning",
};

function formatDateShort(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PortafoglioTab({ clientId, balance, transactions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<WalletTipo>("ricarica");
  const [importo, setImporto] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTipo("ricarica");
    setImporto("");
    setDescrizione("");
    setError(null);
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = parseFloat(importo);
    if (!Number.isFinite(value) || value === 0) {
      setError("Importo non valido");
      return;
    }
    startTransition(async () => {
      try {
        await addWalletTransaction({
          clientId,
          tipo,
          importo: value,
          descrizione: descrizione || null,
        });
        reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Saldo portafoglio
            </p>
            <p className="mt-1 flex items-center gap-2 text-3xl font-semibold text-brown">
              <Wallet className="h-6 w-6 text-rose" />
              {formatCurrency(balance)}
            </p>
          </div>
          {!open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-rose px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-dark"
            >
              <Plus className="h-4 w-4" />
              Nuova movimentazione
            </button>
          )}
        </div>

        {open && (
          <form
            onSubmit={handleSubmit}
            className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-3"
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-brown">
                Tipo
              </span>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as WalletTipo)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-brown focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
              >
                {VALID_WALLET_TIPI.map((t) => (
                  <option key={t} value={t}>
                    {WALLET_TIPO_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-brown">
                Importo (€)
                {tipo === "aggiustamento" && (
                  <span className="ml-1 text-muted-foreground">
                    (segno libero)
                  </span>
                )}
              </span>
              <input
                type="number"
                step="0.01"
                min={tipo === "aggiustamento" ? undefined : "0.01"}
                value={importo}
                onChange={(e) => setImporto(e.target.value)}
                required
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-brown">
                Descrizione
              </span>
              <input
                type="text"
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                placeholder="Es. Acconto pacchetto pressoterapia"
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
              />
            </label>

            {error && (
              <p className="text-sm text-destructive sm:col-span-3">{error}</p>
            )}

            <div className="flex items-center gap-2 sm:col-span-3">
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-full bg-rose px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-dark disabled:opacity-50"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Registra
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={pending}
                className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-brown transition-colors hover:bg-muted"
              >
                Annulla
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h3 className="font-semibold text-brown">
            Transazioni{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({transactions.length})
            </span>
          </h3>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nessuna movimentazione registrata.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Data</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 text-right font-medium">Importo</th>
                  <th className="px-4 py-2 font-medium">Descrizione</th>
                  <th className="px-4 py-2 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((t) => {
                  const tipoKey = t.tipo as WalletTipo;
                  const badgeColor =
                    TIPO_BADGE_COLOR[tipoKey] || "bg-muted text-muted-foreground";
                  const isPositive =
                    WALLET_TIPI_POSITIVI.includes(tipoKey) || t.importo > 0;
                  const importoColor =
                    t.importo > 0
                      ? "text-success"
                      : t.importo < 0
                        ? "text-destructive"
                        : "text-brown";
                  return (
                    <tr key={t.id}>
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatDateShort(t.created_at)}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}
                        >
                          {WALLET_TIPO_LABEL[tipoKey] || t.tipo}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-semibold ${importoColor}`}
                      >
                        {isPositive && t.importo > 0 ? "+" : ""}
                        {formatCurrency(t.importo)}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {t.descrizione || "—"}
                      </td>
                      <td className="px-4 py-2 text-right text-brown">
                        {formatCurrency(t.saldo_dopo)}
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
