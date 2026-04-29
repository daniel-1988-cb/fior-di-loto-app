"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ExternalLink } from "lucide-react";
import { Card, CardContent, Input, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type {
  ReorderSuggestion,
  ReorderUrgency,
} from "@/lib/actions/reorder-suggestions";

type FilterUrgency = "all" | ReorderUrgency;

const URGENCY_LABEL: Record<ReorderUrgency, string> = {
  critical: "Esaurito",
  high: "< 7gg",
  medium: "< 15gg",
  low: "< 30gg",
};

const URGENCY_TONE: Record<
  ReorderUrgency,
  "danger" | "warn" | "default" | "muted"
> = {
  critical: "danger",
  high: "warn",
  medium: "default",
  low: "muted",
};

interface ReorderTableProps {
  suggestions: ReorderSuggestion[];
}

export function ReorderTable({ suggestions }: ReorderTableProps) {
  const [filter, setFilter] = useState<FilterUrgency>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let out = suggestions;
    if (filter !== "all") {
      out = out.filter((s) => s.urgency === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (s) =>
          s.nome.toLowerCase().includes(q) ||
          (s.categoria ?? "").toLowerCase().includes(q),
      );
    }
    return out;
  }, [suggestions, filter, search]);

  const filterCounts = useMemo(() => {
    const counts: Record<FilterUrgency, number> = {
      all: suggestions.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const s of suggestions) counts[s.urgency]++;
    return counts;
  }, [suggestions]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="Tutti"
            count={filterCounts.all}
          />
          <FilterChip
            active={filter === "critical"}
            onClick={() => setFilter("critical")}
            label="Esauriti"
            count={filterCounts.critical}
            tone="danger"
          />
          <FilterChip
            active={filter === "high"}
            onClick={() => setFilter("high")}
            label="< 7gg"
            count={filterCounts.high}
            tone="warn"
          />
          <FilterChip
            active={filter === "medium"}
            onClick={() => setFilter("medium")}
            label="< 15gg"
            count={filterCounts.medium}
          />
          <FilterChip
            active={filter === "low"}
            onClick={() => setFilter("low")}
            label="< 30gg"
            count={filterCounts.low}
          />
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca prodotto o marchio…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Prodotto</th>
                  <th className="px-4 py-3 font-medium">Marchio</th>
                  <th className="px-4 py-3 font-medium text-right">Giacenza</th>
                  <th
                    className="px-4 py-3 font-medium text-right"
                    title="Vendite medie giornaliere ultimi 90gg"
                  >
                    Vendite/gg
                  </th>
                  <th
                    className="px-4 py-3 font-medium text-right"
                    title="Peso stagionale per il mese di consegna previsto"
                  >
                    Stagione
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Copertura</th>
                  <th className="px-4 py-3 font-medium text-right">Qty suggerita</th>
                  <th className="px-4 py-3 font-medium text-right">Valore</th>
                  <th className="px-4 py-3 font-medium" aria-label="Azioni"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      Nessun risultato per il filtro corrente.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <ReorderRow key={s.productId} item={s} />
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

function ReorderRow({ item }: { item: ReorderSuggestion }) {
  const tone = URGENCY_TONE[item.urgency];
  const coperturaLabel =
    item.daysRemaining === null
      ? "—"
      : item.daysRemaining < 1
        ? "< 1gg"
        : `${Math.round(item.daysRemaining)}gg`;
  return (
    <tr className="border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-2 w-2 shrink-0 rounded-full",
              tone === "danger" && "bg-danger",
              tone === "warn" && "bg-amber-500",
              tone === "default" && "bg-primary",
              tone === "muted" && "bg-muted-foreground/40",
            )}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="font-medium truncate">{item.nome}</p>
            <p className="text-[10px] text-muted-foreground">
              {URGENCY_LABEL[item.urgency]}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {item.categoria ?? "—"}
      </td>
      <td className="px-4 py-3 text-right font-mono">
        <span
          className={cn(
            item.giacenza === 0 && "text-danger font-semibold",
            item.sogliaAlert !== null &&
              item.giacenza > 0 &&
              item.giacenza <= item.sogliaAlert &&
              "text-amber-600",
          )}
        >
          {item.giacenza}
        </span>
        {item.sogliaAlert !== null && (
          <span className="ml-1 text-xs text-muted-foreground">
            / {item.sogliaAlert}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
        {item.avgDailyConsumption > 0
          ? item.avgDailyConsumption.toFixed(2)
          : "—"}
      </td>
      <td className="px-4 py-3 text-right font-mono">
        {item.seasonalWeight === 1 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
              item.seasonalWeight > 1.2 && "bg-amber-500/10 text-amber-700",
              item.seasonalWeight < 0.8 && "bg-muted text-muted-foreground",
              item.seasonalWeight >= 0.8 &&
                item.seasonalWeight <= 1.2 &&
                "text-muted-foreground",
            )}
            title={`Peso stagionale: ${item.seasonalWeight.toFixed(2)}× rispetto al consumo medio annuale`}
          >
            {item.seasonalWeight > 1 ? "↑" : item.seasonalWeight < 1 ? "↓" : ""}
            {item.seasonalWeight.toFixed(2)}×
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono">{coperturaLabel}</td>
      <td className="px-4 py-3 text-right font-mono font-semibold">
        {item.suggestedReorderQty}
      </td>
      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
        {formatCurrency(item.suggestedReorderValue)}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/prodotti/${item.productId}/modifica`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Apri <ExternalLink className="h-3 w-3" />
        </Link>
      </td>
    </tr>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  tone = "default",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: "default" | "danger" | "warn";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      <span>{label}</span>
      <Badge
        className={cn(
          "h-4 min-w-4 px-1 text-[10px] font-semibold",
          active && "bg-background/20 text-background",
          !active && tone === "danger" && count > 0 && "bg-danger/15 text-danger",
          !active && tone === "warn" && count > 0 && "bg-amber-500/15 text-amber-700",
        )}
      >
        {count}
      </Badge>
    </button>
  );
}
