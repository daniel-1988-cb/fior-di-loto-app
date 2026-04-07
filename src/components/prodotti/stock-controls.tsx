"use client";

import { useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { updateGiacenza } from "@/lib/actions/products";

export function StockControls({
  productId,
  initialGiacenza,
  sogliaAlert,
}: {
  productId: string;
  initialGiacenza: number;
  sogliaAlert: number;
}) {
  const [giacenza, setGiacenza] = useState(initialGiacenza);
  const [isPending, startTransition] = useTransition();

  function handleDelta(delta: number) {
    const next = Math.max(0, giacenza + delta);
    setGiacenza(next);
    startTransition(async () => {
      try {
        await updateGiacenza(productId, delta);
      } catch {
        // revert on error
        setGiacenza(giacenza);
      }
    });
  }

  const isLow = giacenza <= sogliaAlert;

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => handleDelta(-1)}
        disabled={giacenza === 0 || isPending}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span
        className={`min-w-[2rem] text-center text-sm font-bold tabular-nums ${
          giacenza === 0
            ? "text-red-600"
            : isLow
            ? "text-amber-600"
            : "text-brown"
        }`}
      >
        {giacenza}
      </span>
      <button
        onClick={() => handleDelta(1)}
        disabled={isPending}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground hover:border-green-300 hover:bg-green-50 hover:text-green-600 disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
