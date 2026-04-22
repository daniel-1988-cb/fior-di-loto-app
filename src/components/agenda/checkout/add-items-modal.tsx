"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X, Loader2, Plus } from "lucide-react";
import { getServices } from "@/lib/actions/services";
import { getProducts } from "@/lib/actions/products";
import { getVouchers } from "@/lib/actions/vouchers";

export type AddItemsCategory = "servizi" | "prodotti" | "buoni";

export type PickedItem = {
 refId: string;
 label: string;
 unitPrice: number;
 meta?: string;
};

type Props = {
 open: boolean;
 category: AddItemsCategory;
 onClose: () => void;
 onPick: (item: PickedItem) => void;
};

type RawRow = {
 id: string;
 nome?: string | null;
 prezzo?: number | string | null;
 durata?: number | null;
 categoria?: string | null;
 giacenza?: number | null;
 // vouchers shape
 codice?: string | null;
 valore?: number | string | null;
 tipo?: string | null;
 usato?: boolean | null;
};

const TITLES: Record<AddItemsCategory, string> = {
 servizi: "Aggiungi servizio",
 prodotti: "Aggiungi prodotto",
 buoni: "Aggiungi buono",
};

const EMPTY_LABEL: Record<AddItemsCategory, string> = {
 servizi: "Nessun servizio disponibile.",
 prodotti: "Nessun prodotto disponibile.",
 buoni: "Nessun buono disponibile.",
};

/**
 * Modale semplice (overlay + card) per scegliere un item da aggiungere al
 * carrello. Carica lazily i dati via server action in base alla categoria,
 * offre una search substring case-insensitive.
 *
 * Non usa librerie dialog — fixed inset + bg-black/50, chiude su Escape
 * e click overlay. Focus è lasciato sul primo input al mount.
 */
export function AddItemsModal({ open, category, onClose, onPick }: Props) {
 const [rows, setRows] = useState<RawRow[]>([]);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [query, setQuery] = useState("");

 // Close on Escape
 useEffect(() => {
  if (!open) return;
  const onKey = (e: KeyboardEvent) => {
   if (e.key === "Escape") onClose();
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
 }, [open, onClose]);

 // Load data when modal opens / category changes
 useEffect(() => {
  if (!open) return;
  let cancelled = false;
  setLoading(true);
  setError(null);
  setQuery("");

  async function load() {
   try {
    let data: unknown[] = [];
    if (category === "servizi") data = (await getServices()) as unknown[];
    else if (category === "prodotti") data = (await getProducts()) as unknown[];
    else if (category === "buoni") {
     const all = (await getVouchers()) as RawRow[];
     data = all.filter((v) => !v.usato);
    }
    if (!cancelled) setRows(data as RawRow[]);
   } catch (err) {
    console.error("AddItemsModal load error:", err);
    if (!cancelled) setError("Errore nel caricamento dei dati.");
   } finally {
    if (!cancelled) setLoading(false);
   }
  }
  load();
  return () => {
   cancelled = true;
  };
 }, [open, category]);

 const filtered = useMemo(() => {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => {
   const label =
    category === "buoni"
     ? `${r.codice ?? ""} ${r.tipo ?? ""}`
     : r.nome ?? "";
   return label.toLowerCase().includes(q);
  });
 }, [rows, query, category]);

 function handlePick(row: RawRow) {
  if (category === "servizi") {
   onPick({
    refId: row.id,
    label: row.nome ?? "Servizio",
    unitPrice: Number(row.prezzo ?? 0),
    meta: row.durata ? `${row.durata}min` : undefined,
   });
  } else if (category === "prodotti") {
   onPick({
    refId: row.id,
    label: row.nome ?? "Prodotto",
    unitPrice: Number(row.prezzo ?? 0),
    meta: row.categoria ?? undefined,
   });
  } else {
   // voucher: negative unit price to apply as sconto
   const valore = Number(row.valore ?? 0);
   onPick({
    refId: row.id,
    label: `Buono ${row.codice ?? ""}`.trim(),
    unitPrice: -Math.abs(valore),
    meta: row.tipo ?? undefined,
   });
  }
  onClose();
 }

 if (!open) return null;

 return (
  <div
   role="dialog"
   aria-modal="true"
   aria-labelledby="add-items-title"
   className="fixed inset-0 z-50 flex items-center justify-center p-4"
  >
   {/* Overlay */}
   <button
    type="button"
    aria-label="Chiudi"
    onClick={onClose}
    className="absolute inset-0 bg-black/50"
   />

   {/* Card */}
   <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
    {/* Header */}
    <div className="flex items-center justify-between border-b border-border px-6 py-4">
     <h2 id="add-items-title" className="text-lg font-semibold text-foreground">
      {TITLES[category]}
     </h2>
     <button
      type="button"
      onClick={onClose}
      aria-label="Chiudi"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
     >
      <X className="h-5 w-5" />
     </button>
    </div>

    {/* Search */}
    <div className="border-b border-border px-6 py-3">
     <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
       autoFocus
       type="search"
       value={query}
       onChange={(e) => setQuery(e.target.value)}
       placeholder={
        category === "buoni" ? "Cerca per codice..." : "Cerca per nome..."
       }
       className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
      />
     </div>
    </div>

    {/* Body */}
    <div className="flex-1 overflow-y-auto">
     {loading && (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
       <Loader2 className="h-4 w-4 animate-spin" /> Caricamento...
      </div>
     )}
     {!loading && error && (
      <p className="px-6 py-12 text-center text-sm text-danger">{error}</p>
     )}
     {!loading && !error && filtered.length === 0 && (
      <p className="px-6 py-12 text-center text-sm text-muted-foreground">
       {query ? "Nessun risultato." : EMPTY_LABEL[category]}
      </p>
     )}
     {!loading && !error && filtered.length > 0 && (
      <ul className="divide-y divide-border">
       {filtered.map((row) => {
        const primary =
         category === "buoni"
          ? row.codice ?? "Buono"
          : row.nome ?? "—";
        const secondary =
         category === "servizi"
          ? [row.categoria, row.durata ? `${row.durata}min` : null]
            .filter(Boolean)
            .join(" · ")
          : category === "prodotti"
          ? [row.categoria, row.giacenza != null ? `${row.giacenza} pz` : null]
            .filter(Boolean)
            .join(" · ")
          : [row.tipo, row.valore ? `€ ${Number(row.valore).toFixed(2)}` : null]
            .filter(Boolean)
            .join(" · ");
        const price =
         category === "buoni"
          ? -Math.abs(Number(row.valore ?? 0))
          : Number(row.prezzo ?? 0);
        return (
         <li key={row.id}>
          <button
           type="button"
           onClick={() => handlePick(row)}
           className="flex w-full items-center justify-between gap-4 px-6 py-3 text-left transition-colors hover:bg-muted"
          >
           <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
             {primary}
            </p>
            {secondary && (
             <p className="truncate text-xs text-muted-foreground">{secondary}</p>
            )}
           </div>
           <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm font-semibold text-foreground">
             {price < 0 ? "-" : ""}€ {Math.abs(price).toFixed(2)}
            </span>
            <Plus className="h-4 w-4 text-rose" />
           </div>
          </button>
         </li>
        );
       })}
      </ul>
     )}
    </div>
   </div>
  </div>
 );
}
