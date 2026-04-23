"use client";

import { useState, useTransition, useEffect } from "react";
import { ArrowDownCircle, ArrowUpCircle, X } from "lucide-react";
import { Card, Button, Badge } from "@/components/ui";
import { formatDateShort } from "@/lib/utils";
import {
  getInventoryMovements,
  type InventoryMovement,
} from "@/lib/actions/inventario";

/**
 * Drawer-like modal che mostra la cronologia di entrate/uscite per un prodotto.
 * Caricata al mount via server action getInventoryMovements.
 */
export function InventarioMovimenti({
  productId,
  productNome,
  onClose,
}: {
  productId: string;
  productNome: string;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<InventoryMovement[] | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getInventoryMovements(productId);
        setMovements(data);
      } catch {
        setMovements([]);
      }
    });
  }, [productId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border p-6 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Movimenti magazzino</h2>
            <p className="text-sm text-muted-foreground">{productNome}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          {movements === null ? (
            <p className="text-center text-sm text-muted-foreground">
              Caricamento...
            </p>
          ) : movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessun movimento registrato per questo prodotto.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {movements.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`rounded-lg p-2 ${
                        m.tipo === "entrata"
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger"
                      }`}
                    >
                      {m.tipo === "entrata" ? (
                        <ArrowDownCircle className="h-4 w-4" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.riferimento}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.data ? formatDateShort(m.data) : "—"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={m.tipo === "entrata" ? "success" : "danger"}>
                    {m.qty > 0 ? "+" : ""}
                    {m.qty}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
