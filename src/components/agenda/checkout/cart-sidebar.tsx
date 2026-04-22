"use client";

import { Minus, Plus, X, CreditCard } from "lucide-react";
import type { CartState, CartItem } from "@/lib/cart/types";
import { cartSubtotal } from "@/lib/cart/types";

type Props = {
 cart: CartState;
 clientName: string;
 clientPhone: string | null;
 onRemove: (id: string) => void;
 onSetQuantity: (id: string, qty: number) => void;
 onProceed: () => void;
};

const IVA_RATE = 0.22;

/**
 * Sidebar destra della pagina carrello.
 * Mostra cliente + lista line items + totali (subtotale / imposta / totale)
 * e il CTA "Procedi con il pagamento".
 *
 * Pricing convention (allineata a checkout/[id]/page.tsx): i prezzi stored nei
 * CartItem sono IVA-inclusi, quindi il "totale" = cartSubtotal, il "subtotale"
 * mostrato è scorporato (= totale / 1.22), e l'imposta è la differenza.
 */
export function CartSidebar({
 cart,
 clientName,
 clientPhone,
 onRemove,
 onSetQuantity,
 onProceed,
}: Props) {
 const totale = cartSubtotal(cart);
 const subtotaleNetto = totale / (1 + IVA_RATE);
 const imposta = totale - subtotaleNetto;
 const clientInitial = (clientName || "?").charAt(0).toUpperCase();
 const canProceed = cart.items.length > 0;

 return (
  <aside className="w-full shrink-0 border-t border-border bg-card lg:h-full lg:w-[360px] lg:border-l lg:border-t-0">
   <div className="flex h-full flex-col">
    {/* Cliente */}
    <div className="border-b border-border px-6 py-5">
     <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
       <p className="truncate text-base font-semibold text-foreground">
        {clientName}
       </p>
       {clientPhone && (
        <p className="truncate text-xs text-muted-foreground">{clientPhone}</p>
       )}
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose/10 text-sm font-semibold text-rose">
       {clientInitial}
      </div>
     </div>
    </div>

    {/* Line items */}
    <div className="flex-1 overflow-y-auto px-6 py-4">
     {cart.items.length === 0 ? (
      <p className="py-8 text-center text-sm text-muted-foreground">
       Il carrello è vuoto.
      </p>
     ) : (
      <ul className="space-y-3">
       {cart.items.map((item) => (
        <CartLine
         key={item.id}
         item={item}
         onRemove={onRemove}
         onSetQuantity={onSetQuantity}
        />
       ))}
      </ul>
     )}
    </div>

    {/* Totali */}
    <div className="border-t border-border px-6 py-4">
     <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between text-muted-foreground">
       <dt>Subtotale</dt>
       <dd>€ {subtotaleNetto.toFixed(2)}</dd>
      </div>
      <div className="flex justify-between text-muted-foreground">
       <dt>Imposta (IVA 22%)</dt>
       <dd>€ {imposta.toFixed(2)}</dd>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold text-foreground">
       <dt>Totale</dt>
       <dd>€ {totale.toFixed(2)}</dd>
      </div>
     </dl>
    </div>

    {/* CTA */}
    <div className="border-t border-border p-4">
     <button
      type="button"
      onClick={onProceed}
      disabled={!canProceed}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
     >
      <CreditCard className="h-4 w-4" />
      Procedi con il pagamento
     </button>
    </div>
   </div>
  </aside>
 );
}

function CartLine({
 item,
 onRemove,
 onSetQuantity,
}: {
 item: CartItem;
 onRemove: (id: string) => void;
 onSetQuantity: (id: string, qty: number) => void;
}) {
 const lineTotal = item.unitPrice * item.quantity;
 const canAdjustQty = item.kind !== "card_regalo" && item.kind !== "voucher";
 const metaParts: string[] = [];
 if (item.quantity > 1) metaParts.push(`qty ${item.quantity}`);
 if (item.staffId) metaParts.push("Staff");
 metaParts.push(
  `€ ${item.unitPrice.toFixed(2)}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`,
 );

 return (
  <li className="rounded-lg border border-border bg-background px-3 py-2.5">
   <div className="flex items-start justify-between gap-2">
    <div className="min-w-0 flex-1">
     <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
     <p className="truncate text-xs text-muted-foreground">{metaParts.join(" · ")}</p>
    </div>
    <div className="flex shrink-0 items-center gap-2">
     <span
      className={`text-sm font-semibold ${
       lineTotal < 0 ? "text-emerald-600" : "text-foreground"
      }`}
     >
      {lineTotal < 0 ? "-" : ""}€ {Math.abs(lineTotal).toFixed(2)}
     </span>
     <button
      type="button"
      onClick={() => onRemove(item.id)}
      aria-label={`Rimuovi ${item.label}`}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
     >
      <X className="h-3.5 w-3.5" />
     </button>
    </div>
   </div>
   {canAdjustQty && (
    <div className="mt-2 flex items-center gap-2">
     <button
      type="button"
      onClick={() => onSetQuantity(item.id, item.quantity - 1)}
      aria-label="Diminuisci quantità"
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
     >
      <Minus className="h-3.5 w-3.5" />
     </button>
     <span className="min-w-6 text-center text-sm font-medium text-foreground">
      {item.quantity}
     </span>
     <button
      type="button"
      onClick={() => onSetQuantity(item.id, item.quantity + 1)}
      aria-label="Aumenta quantità"
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
     >
      <Plus className="h-3.5 w-3.5" />
     </button>
    </div>
   )}
  </li>
 );
}
