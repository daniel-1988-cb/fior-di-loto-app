"use client";

import { Search, type LucideIcon } from "lucide-react";
import { type AddItemsCategory } from "@/components/agenda/checkout/add-items-modal";
import { CartSidebar } from "@/components/agenda/checkout/cart-sidebar";
import { QuickSaleTiles } from "@/components/agenda/checkout/quick-sale-tiles";
import { type CardRegaloPreset } from "@/lib/cart/types";
import { type useCart } from "@/lib/cart/storage";

export type CategoryCard = {
  id: "appuntamenti" | AddItemsCategory | "abbonamenti";
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  note?: string;
};

export type CartStepProps = {
  query: string;
  setQuery: (v: string) => void;
  filteredCategories: CategoryCard[];
  onCategoryClick: (id: CategoryCard["id"]) => void;
  onPickCardRegalo: (preset: CardRegaloPreset) => void;
  cart: ReturnType<typeof useCart>["cart"];
  clientName: string;
  clientPhone: string | null;
  onRemove: (id: string) => void;
  onSetQuantity: (id: string, qty: number) => void;
  onProceed: () => void;
};

export function CartStep({
  query,
  setQuery,
  filteredCategories,
  onCategoryClick,
  onPickCardRegalo,
  cart,
  clientName,
  clientPhone,
  onRemove,
  onSetQuantity,
  onProceed,
}: CartStepProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      {/* Main (categorie + quick sale) */}
      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
        <h1 className="mb-5 text-2xl font-bold text-foreground">
          Aggiungi al carrello
        </h1>

        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca categoria..."
            className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryClick(cat.id)}
                disabled={cat.disabled}
                className={`relative flex items-center gap-4 rounded-2xl border border-border bg-background p-5 text-left transition-all ${
                  cat.disabled
                    ? "cursor-not-allowed opacity-50"
                    : "hover:border-rose/50 hover:shadow-sm"
                }`}
                title={cat.note}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose/10 text-rose">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{cat.label}</p>
                  {cat.note && (
                    <p className="text-xs text-muted-foreground">{cat.note}</p>
                  )}
                </div>
              </button>
            );
          })}
          {filteredCategories.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              Nessuna categoria trovata.
            </p>
          )}
        </div>

        <QuickSaleTiles onPick={onPickCardRegalo} />
      </div>

      {/* Sidebar carrello */}
      <div className="shrink-0 lg:w-[360px]">
        <CartSidebar
          cart={cart}
          clientName={clientName}
          clientPhone={clientPhone}
          onRemove={onRemove}
          onSetQuantity={onSetQuantity}
          onProceed={onProceed}
        />
      </div>
    </div>
  );
}
