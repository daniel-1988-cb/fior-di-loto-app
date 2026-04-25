/**
 * Cart shared types for the Fase 2 checkout (carrello multi-item + split pay).
 * Both the cart page UI and the pagamento page read/write the same shape via
 * `useCart()` in `./storage.ts`. Keep this file stable: changes here ripple
 * across both routes.
 */

export type CartItemKind =
 | "servizio" // from appointments (pre-filled) OR added manually
 | "prodotto" // from products table
 | "abbonamento" // placeholder (no subscriptions table yet)
 | "voucher" // existing voucher applied (negative)
 | "card_regalo"; // new gift card being sold — creates a voucher on checkout

export type CartItem = {
 /** stable UUID for this cart row (not the product/service id). */
 id: string;
 kind: CartItemKind;
 /** id del servizio/prodotto/etc se applicabile. null per card regalo custom. */
 refId: string | null;
 label: string;
 /** quantità (per card_regalo tipicamente 1). */
 quantity: number;
 /** prezzo per unità (IVA inclusa). Centesimi come decimal. */
 unitPrice: number;
 /** id staff (solo per servizi, opzionale). */
 staffId?: string | null;
 /** metadata del card regalo in vendita (nominativo, scadenza). */
 cardRegalo?: {
  value: number;
  label: string; // "Card Regalo Silver 100€"
 };
 /** Prezzo originale prima dell'applicazione di una regola di pricing dinamico.
  * null/undefined se nessuna regola è stata applicata. Usato dalla UI per
  * mostrare il prezzo barrato accanto a quello aggiustato. */
 originalUnitPrice?: number | null;
 /** UUID della regola applicata (vedi `dynamic_pricing_rules`). */
 appliedRuleId?: string | null;
 /** Etichetta human-readable della regola applicata (es. "Sconto Mattina 10%"). */
 appliedRuleLabel?: string | null;
 /** Delta unitario applicato: positivo = sconto, negativo = maggiorazione. */
 appliedDelta?: number | null;
};

export type SplitPaymentRow = {
 metodo: string; // uno dei VALID_METODI tranne "split"
 amount: number;
};

export type CartState = {
 /** appt sorgente — se presente, al completa segna l'appuntamento come completato. */
 appointmentId: string | null;
 clientId: string | null;
 items: CartItem[];
 /** opzionale: sconto manuale applicato (percentuale o importo). */
 sconto?: { tipo: "percentuale" | "importo"; valore: number } | null;
 /** opzionale: codice voucher applicato al totale. */
 voucherCode?: string | null;
 /** opzionale: split payment allocations (quando metodo = split). */
 splitPayments?: SplitPaymentRow[];
};

/** Preset card regalo (vendita rapida). */
export type CardRegaloPreset = {
 id: string;
 label: string; // "CARD REGALO BRONZE"
 value: number; // 50
 gradient: string; // tailwind classes o css gradient inline
};

export const CARD_REGALO_PRESETS: CardRegaloPreset[] = [
 { id: "bronze", label: "CARD REGALO BRONZE", value: 50, gradient: "from-amber-600 to-orange-600" },
 { id: "silver", label: "CARD REGALO SILVER", value: 100, gradient: "from-slate-400 to-slate-600" },
 { id: "gold", label: "CARD REGALO GOLD", value: 150, gradient: "from-yellow-400 to-amber-600" },
 { id: "platinum", label: "CARD REGALO PLATINUM", value: 200, gradient: "from-slate-300 to-slate-500" },
];

export function emptyCart(appointmentId?: string, clientId?: string): CartState {
 return {
  appointmentId: appointmentId ?? null,
  clientId: clientId ?? null,
  items: [],
  sconto: null,
  voucherCode: null,
  splitPayments: [],
 };
}

export function cartSubtotal(cart: CartState): number {
 return cart.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}
