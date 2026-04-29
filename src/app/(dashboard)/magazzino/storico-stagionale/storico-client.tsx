"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/magazzino/sparkline";
import type { ProductMonthlySales } from "@/lib/actions/seasonal-history";

const MESI_ABBR = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
];

interface Props {
  items: ProductMonthlySales[];
  categorie: string[];
}

export function StoricoStagionaleClient({ items, categorie }: Props) {
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState<string>("all");
  const [hideEmpty, setHideEmpty] = useState(true);

  const filtered = useMemo(() => {
    let out = items;
    if (categoria !== "all") {
      out = out.filter((it) => it.categoria === categoria);
    }
    if (hideEmpty) {
      out = out.filter((it) => it.yearsActive > 0);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (it) =>
          it.nome.toLowerCase().includes(q) ||
          (it.categoria ?? "").toLowerCase().includes(q),
      );
    }
    return out;
  }, [items, categoria, hideEmpty, search]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">Tutte le categorie</option>
            {categorie.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={hideEmpty}
              onChange={(e) => setHideEmpty(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Nascondi senza storico
          </label>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca prodotto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Heatmap table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium min-w-[200px]">
                    Prodotto
                  </th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-2 py-3 font-medium">Curva</th>
                  {MESI_ABBR.map((m) => (
                    <th
                      key={m}
                      className="px-1 py-3 text-center font-medium w-10"
                    >
                      {m}
                    </th>
                  ))}
                  <th className="px-3 py-3 font-medium text-right">12m</th>
                  <th className="px-3 py-3 font-medium text-right">Anni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={17}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      Nessun risultato per il filtro corrente.
                    </td>
                  </tr>
                ) : (
                  filtered.map((it) => (
                    <StoricoRow key={it.productId} item={it} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StoricoRow({ item }: { item: ProductMonthlySales }) {
  const max = Math.max(...item.avgByMonth, 0.01);
  return (
    <tr className="border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-2.5">
        <p className="truncate font-medium">{item.nome}</p>
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[140px]">
        {item.categoria ?? "—"}
      </td>
      <td className="px-2 py-2.5 text-primary">
        <Sparkline values={item.avgByMonth} highlightPeak />
      </td>
      {item.avgByMonth.map((v, i) => {
        const intensity = max > 0 ? v / max : 0;
        return (
          <td
            key={i}
            className="px-1 py-2.5 text-center text-[10px] font-mono"
            title={`${MESI_ABBR[i]}: media ${v.toFixed(1)} unità`}
          >
            <div
              className={cn(
                "mx-auto flex h-6 w-8 items-center justify-center rounded text-[10px]",
                intensity === 0 && "text-muted-foreground/40",
                intensity > 0 &&
                  intensity <= 0.25 &&
                  "bg-primary/10 text-foreground",
                intensity > 0.25 &&
                  intensity <= 0.5 &&
                  "bg-primary/25 text-foreground",
                intensity > 0.5 &&
                  intensity <= 0.75 &&
                  "bg-primary/40 text-primary-foreground",
                intensity > 0.75 && "bg-primary/70 text-primary-foreground",
              )}
            >
              {v > 0 ? v.toFixed(v < 1 ? 1 : 0) : "·"}
            </div>
          </td>
        );
      })}
      <td className="px-3 py-2.5 text-right font-mono text-xs">
        {item.last12mTotal}
      </td>
      <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">
        {item.yearsActive}
      </td>
    </tr>
  );
}
