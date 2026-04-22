"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Plus, Search, Edit3, Trash2, Inbox } from "lucide-react";
import { Card, Button, Badge, Input } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

export type CatalogoItem = {
  id: string;
  nome: string;
  /** Free-form secondary line (es. "60 min · viso" o "Giacenza 12") */
  meta?: string | null;
  /** Prezzo in euro. Se undefined non mostra colonna prezzo. */
  prezzo?: number;
  /** Badge/tag secondari mostrati accanto al nome */
  badges?: { label: string; variant?: "default" | "primary" | "outline" | "success" | "warning" | "danger" }[];
  attivo: boolean;
};

export type CatalogoListViewProps<T extends CatalogoItem> = {
  items: T[];
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  newButtonLabel?: string;
  /** Show empty state with this message when no items and no filter applied */
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  onNew?: () => void;
  onEdit?: (item: T) => void;
  onToggleAttivo?: (item: T, next: boolean) => Promise<void> | void;
  onDelete?: (item: T) => Promise<void> | void;
  /** Optional extra slot rendered before the table, es. stats cards */
  headerExtra?: ReactNode;
};

// ============================================
// COMPONENT
// ============================================

export function CatalogoListView<T extends CatalogoItem>({
  items,
  title,
  subtitle,
  searchPlaceholder = "Cerca...",
  newButtonLabel = "Nuovo",
  emptyMessage = "Nessun elemento. Crea il primo.",
  emptyIcon,
  onNew,
  onEdit,
  onToggleAttivo,
  onDelete,
  headerExtra,
}: CatalogoListViewProps<T>) {
  const [query, setQuery] = useState("");
  const [soloAttivi, setSoloAttivi] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (soloAttivi && !it.attivo) return false;
      if (!q) return true;
      return (
        it.nome.toLowerCase().includes(q) ||
        (it.meta ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, soloAttivi]);

  function handleToggle(item: T) {
    if (!onToggleAttivo) return;
    setPendingId(item.id);
    startTransition(async () => {
      try {
        await onToggleAttivo(item, !item.attivo);
      } finally {
        setPendingId(null);
      }
    });
  }

  function handleDelete(item: T) {
    if (!onDelete) return;
    if (
      !confirm(
        `Eliminare "${item.nome}"? Se referenziato da vendite verrà archiviato.`
      )
    ) {
      return;
    }
    setPendingId(item.id);
    startTransition(async () => {
      try {
        await onDelete(item);
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {(title || subtitle || onNew) && (
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && (
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {onNew && (
            <Button onClick={onNew}>
              <Plus className="h-4 w-4" /> {newButtonLabel}
            </Button>
          )}
        </header>
      )}

      {headerExtra}

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={soloAttivi}
              onChange={(e) => setSoloAttivi(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Solo attivi
          </label>
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} / {items.length}
          </span>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            {emptyIcon ?? <Inbox className="h-6 w-6" />}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {items.length === 0 ? emptyMessage : "Nessun risultato con i filtri correnti."}
          </p>
          {items.length === 0 && onNew && (
            <Button className="mt-4" onClick={onNew}>
              <Plus className="h-4 w-4" /> {newButtonLabel}
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Nome</th>
                  <th className="px-4 py-3 text-left font-medium">Dettagli</th>
                  <th className="px-4 py-3 text-right font-medium">Prezzo</th>
                  <th className="px-4 py-3 text-center font-medium">Stato</th>
                  <th className="px-4 py-3 text-right font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => {
                  const pending = pendingId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{item.nome}</span>
                          {item.badges?.map((b, i) => (
                            <Badge key={i} variant={b.variant ?? "outline"}>
                              {b.label}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {item.meta ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {typeof item.prezzo === "number"
                          ? formatCurrency(item.prezzo)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {onToggleAttivo ? (
                          <button
                            type="button"
                            onClick={() => handleToggle(item)}
                            disabled={pending}
                            className={`inline-flex h-6 w-11 items-center rounded-full border transition-colors disabled:opacity-50 ${
                              item.attivo
                                ? "border-success/30 bg-success/20"
                                : "border-border bg-muted"
                            }`}
                            aria-label={item.attivo ? "Disattiva" : "Attiva"}
                          >
                            <span
                              className={`h-4 w-4 rounded-full bg-card shadow transition-transform ${
                                item.attivo
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        ) : item.attivo ? (
                          <Badge variant="success">Attivo</Badge>
                        ) : (
                          <Badge variant="default">Disattivo</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(item)}
                              disabled={pending}
                              aria-label={`Modifica ${item.nome}`}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item)}
                              disabled={pending}
                              aria-label={`Elimina ${item.nome}`}
                            >
                              <Trash2 className="h-4 w-4 text-danger" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
