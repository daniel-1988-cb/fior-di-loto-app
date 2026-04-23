"use client";

import { useMemo, useState } from "react";
import { Package, AlertTriangle } from "lucide-react";
import { Card, Button, Badge, Input, Select } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { InventarioMovimenti } from "@/components/catalogo/inventario-movimenti";
import type { InventoryRow } from "@/lib/actions/inventario";

const STATO_LABEL: Record<InventoryRow["stato"], string> = {
  ok: "OK",
  basso: "Scorta bassa",
  esaurito: "Esaurito",
};

const STATO_VARIANT: Record<
  InventoryRow["stato"],
  "success" | "warning" | "danger"
> = {
  ok: "success",
  basso: "warning",
  esaurito: "danger",
};

export function InventarioClient({ rows }: { rows: InventoryRow[] }) {
  const [query, setQuery] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [categoria, setCategoria] = useState<string>("");
  const [selected, setSelected] = useState<{ id: string; nome: string } | null>(
    null
  );

  const categorie = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r.categoria) s.add(r.categoria);
    });
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyLow && r.stato === "ok") return false;
      if (categoria && r.categoria !== categoria) return false;
      if (!q) return true;
      return (
        r.nome.toLowerCase().includes(q) ||
        (r.categoria ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, onlyLow, categoria]);

  // Stats (from full rows, not filtered)
  const stats = useMemo(() => {
    return {
      totalProducts: rows.length,
      lowStockCount: rows.filter((r) => r.stato === "basso").length,
      outOfStockCount: rows.filter((r) => r.stato === "esaurito").length,
      totalValue: rows.reduce((s, r) => s + r.valoreStock, 0),
    };
  }, [rows]);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Giacenza, valore stock e cronologia movimenti.
        </p>
      </header>

      <section className="mb-6 grid gap-3 md:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Prodotti totali
          </p>
          <p className="mt-1 text-2xl font-bold">{stats.totalProducts}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Valore magazzino
          </p>
          <p className="mt-1 text-2xl font-bold">
            {formatCurrency(stats.totalValue)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Scorte basse
          </p>
          <p className="mt-1 text-2xl font-bold text-warning">
            {stats.lowStockCount}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Esauriti
          </p>
          <p className="mt-1 text-2xl font-bold text-danger">
            {stats.outOfStockCount}
          </p>
        </Card>
      </section>

      <Card className="p-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca prodotto..."
            className="max-w-xs"
          />
          {categorie.length > 0 && (
            <Select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="max-w-[200px]"
            >
              <option value="">Tutte categorie</option>
              {categorie.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={onlyLow}
              onChange={(e) => setOnlyLow(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Solo scorte basse/esaurite
          </label>
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} / {rows.length}
          </span>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Package className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {rows.length === 0
              ? "Nessun prodotto in catalogo."
              : "Nessun prodotto corrisponde ai filtri."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Prodotto</th>
                  <th className="px-4 py-3 text-left font-medium">Categoria</th>
                  <th className="px-4 py-3 text-right font-medium">Giacenza</th>
                  <th className="px-4 py-3 text-right font-medium">Soglia</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Valore stock
                  </th>
                  <th className="px-4 py-3 text-center font-medium">Stato</th>
                  <th className="px-4 py-3 text-right font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {r.imageUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={r.imageUrl}
                            alt=""
                            className="h-8 w-8 rounded object-cover"
                          />
                        )}
                        <span>{r.nome}</span>
                        {!r.attivo && (
                          <Badge variant="default">inattivo</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.categoria ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {r.giacenza}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {r.sogliaAlert}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(r.valoreStock)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={STATO_VARIANT[r.stato]}>
                        {STATO_LABEL[r.stato]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelected({ id: r.id, nome: r.nome })
                        }
                      >
                        Movimenti
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selected && (
        <InventarioMovimenti
          productId={selected.id}
          productNome={selected.nome}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
