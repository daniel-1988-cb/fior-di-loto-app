"use client";

import { CARD_REGALO_PRESETS, type CardRegaloPreset } from "@/lib/cart/types";

type Props = {
 onPick: (preset: CardRegaloPreset) => void;
};

/**
 * Griglia 2x2 dei 4 preset card regalo (Bronze / Silver / Gold / Platinum).
 * Ogni tile è un bottone con gradient del preset; click -> onPick(preset).
 * Viene consumata da `carrello/page.tsx` che aggiunge al carrello
 * un CartItem con kind="card_regalo".
 */
export function QuickSaleTiles({ onPick }: Props) {
 return (
  <section aria-labelledby="quick-sale-heading" className="mt-10">
   <div className="mb-4 flex items-center justify-between">
    <h2 id="quick-sale-heading" className="text-lg font-semibold text-foreground">
     Vendita rapida
    </h2>
    <button
     type="button"
     disabled
     className="text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed"
     aria-disabled="true"
     title="Prossimamente"
    >
     Modifica
    </button>
   </div>

   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {CARD_REGALO_PRESETS.map((preset) => (
     <button
      key={preset.id}
      type="button"
      onClick={() => onPick(preset)}
      className={`group relative flex h-28 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${preset.gradient} p-4 text-left text-white shadow-sm transition-transform hover:scale-[1.015] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-rose/40`}
     >
      <span className="text-xs font-semibold uppercase tracking-wider drop-shadow-sm">
       {preset.label}
      </span>
      <span className="text-3xl font-bold drop-shadow-sm">
       € {preset.value}
      </span>
     </button>
    ))}
   </div>
  </section>
 );
}
