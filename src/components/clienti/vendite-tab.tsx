import { formatCurrency } from "@/lib/utils";

type TransactionRow = {
  id: string;
  data: string;
  descrizione: string | null;
  importo: number;
  metodo_pagamento: string | null;
  categoria: string | null;
};

const METODO_LABEL: Record<string, string> = {
  contanti: "Contanti",
  carta: "Carta",
  bonifico: "Bonifico",
  satispay: "Satispay",
  paypal: "PayPal",
  buono: "Buono",
  saldo: "Saldo cliente",
  qr: "QR",
  self_service: "Self service",
  split: "Split",
  assegno: "Assegno",
  fattura: "Fattura",
  finanziaria: "Finanziaria",
  altro: "Altro",
};

export function VenditeTab({
  transactions,
}: {
  transactions: TransactionRow[];
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Nessuna vendita registrata.</p>
      </div>
    );
  }

  const totale = transactions.reduce(
    (sum, t) => sum + Number(t.importo || 0),
    0,
  );

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-3">
        <h3 className="font-semibold text-brown">
          Vendite ({transactions.length})
        </h3>
      </div>
      <ul className="divide-y divide-border">
        {transactions.map((t) => {
          const dataStr = String(t.data || "").slice(0, 10);
          const dataFormatted = dataStr
            ? new Date(dataStr + "T00:00:00").toLocaleDateString("it-IT", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "—";
          const metodoLabel = t.metodo_pagamento
            ? METODO_LABEL[t.metodo_pagamento] || t.metodo_pagamento
            : "—";
          return (
            <li
              key={t.id}
              className="flex items-center gap-3 px-5 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brown">
                  {t.descrizione || t.categoria || "Vendita"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {dataFormatted} • {metodoLabel}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-brown">
                {formatCurrency(Number(t.importo || 0))}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3">
        <span className="text-sm font-medium text-brown">Totale</span>
        <span className="text-sm font-semibold text-brown">
          {formatCurrency(totale)}
        </span>
      </div>
    </div>
  );
}
