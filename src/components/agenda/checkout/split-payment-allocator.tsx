"use client";

import { Plus, Trash2 } from "lucide-react";
import type { SplitPaymentRow } from "@/lib/cart/types";

/**
 * Allocatore split payment: distribuisce un totale su N metodi di pagamento.
 * - Ogni riga: select metodo + input amount + bottone rimuovi.
 * - "+ Aggiungi metodo" aggiunge una riga con amount = residuo.
 * - Summary mostra allocato vs totale e warning se non quadra.
 *
 * Validazione formale (sum === totale) sta a chi usa il componente —
 * qui segnaliamo solo visivamente lo stato.
 */

type Props = {
 totale: number;
 rows: SplitPaymentRow[];
 onChange: (rows: SplitPaymentRow[]) => void;
};

// Sottoinsieme dei metodi validi — escludiamo "split" per evitare ricorsione.
const METODI_SPLIT: { id: string; label: string }[] = [
 { id: "contanti", label: "Contanti" },
 { id: "carta", label: "Carta di credito" },
 { id: "bonifico", label: "Bonifico" },
 { id: "satispay", label: "Satispay" },
 { id: "paypal", label: "PayPal" },
 { id: "buono", label: "Buono" },
 { id: "qr", label: "Codice QR" },
 { id: "self_service", label: "Pagamento self service" },
 { id: "assegno", label: "Assegno" },
 { id: "fattura", label: "Fattura" },
 { id: "finanziaria", label: "Finanziaria" },
 { id: "altro", label: "Altro" },
];

function round2(n: number): number {
 return Math.round(n * 100) / 100;
}

export function SplitPaymentAllocator({ totale, rows, onChange }: Props) {
 const allocato = round2(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0));
 const residuo = round2(totale - allocato);
 const delta = Math.abs(residuo);
 const quadra = rows.length > 0 && delta < 0.005;

 function updateRow(index: number, patch: Partial<SplitPaymentRow>) {
  const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
  onChange(next);
 }

 function removeRow(index: number) {
  onChange(rows.filter((_, i) => i !== index));
 }

 function addRow() {
  const remaining = round2(Math.max(totale - allocato, 0));
  onChange([
   ...rows,
   { metodo: METODI_SPLIT[0].id, amount: remaining },
  ]);
 }

 return (
  <div className="mt-6 rounded-2xl border border-border bg-card p-5">
   <div className="mb-4 flex items-center justify-between">
    <h2 className="text-base font-semibold text-foreground">Distribuisci il pagamento</h2>
    <span className="text-xs text-muted-foreground">
     Totale € {totale.toFixed(2)}
    </span>
   </div>

   {rows.length === 0 && (
    <p className="mb-4 text-sm text-muted-foreground">
     Nessun metodo aggiunto. Clicca &laquo;Aggiungi metodo&raquo; per iniziare.
    </p>
   )}

   {rows.length > 0 && (
    <div className="space-y-2">
     {rows.map((row, i) => (
      <div
       key={i}
       className="flex items-center gap-2 rounded-lg border border-border bg-background p-2"
      >
       <select
        value={row.metodo}
        onChange={(e) => updateRow(i, { metodo: e.target.value })}
        className="flex-1 rounded-md border border-input bg-card px-2 py-1.5 text-sm text-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
        aria-label={`Metodo di pagamento riga ${i + 1}`}
       >
        {METODI_SPLIT.map((m) => (
         <option key={m.id} value={m.id}>
          {m.label}
         </option>
        ))}
       </select>
       <div className="relative w-32 shrink-0">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
         €
        </span>
        <input
         type="number"
         min="0"
         step="0.01"
         value={Number.isFinite(row.amount) ? row.amount : 0}
         onChange={(e) =>
          updateRow(i, { amount: parseFloat(e.target.value) || 0 })
         }
         className="w-full rounded-md border border-input bg-card py-1.5 pl-6 pr-2 text-right text-sm text-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
         aria-label={`Importo riga ${i + 1}`}
        />
       </div>
       <button
        type="button"
        onClick={() => removeRow(i)}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Rimuovi riga ${i + 1}`}
       >
        <Trash2 className="h-4 w-4" />
       </button>
      </div>
     ))}
    </div>
   )}

   <button
    type="button"
    onClick={addRow}
    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
   >
    <Plus className="h-4 w-4" />
    Aggiungi metodo
   </button>

   <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
    <span className="text-sm text-muted-foreground">
     Allocato <strong className="text-foreground">€ {allocato.toFixed(2)}</strong>{" "}
     di € {totale.toFixed(2)}
    </span>
    {quadra ? (
     <span className="text-sm font-medium text-emerald-600">Quadra</span>
    ) : (
     <span className="text-sm font-medium text-red-500">
      {residuo > 0
       ? `Mancano € ${residuo.toFixed(2)}`
       : `Eccedenza € ${Math.abs(residuo).toFixed(2)}`}
     </span>
    )}
   </div>
  </div>
 );
}
