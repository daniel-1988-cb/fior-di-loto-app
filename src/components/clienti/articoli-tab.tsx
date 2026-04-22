import { formatCurrency } from "@/lib/utils";

type ProductRow = {
  label: string;
  quantity: number;
  totalSpent: number;
  lastDate: string | null;
  refId: string | null;
};

export function ArticoliTab({ products }: { products: ProductRow[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Nessun articolo acquistato.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-3">
        <h3 className="font-semibold text-brown">
          Articoli ({products.length})
        </h3>
      </div>
      <ul className="divide-y divide-border">
        {products.map((p, i) => {
          const dataFormatted = p.lastDate
            ? new Date(p.lastDate + "T00:00:00").toLocaleDateString("it-IT", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "—";
          return (
            <li
              key={p.refId ?? `${p.label}-${i}`}
              className="flex items-center gap-3 px-5 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brown">
                  {p.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Ultimo acquisto: {dataFormatted}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="text-xs text-muted-foreground">
                  Qtà {p.quantity}
                </span>
                <span className="text-sm font-semibold text-brown">
                  {formatCurrency(p.totalSpent)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
