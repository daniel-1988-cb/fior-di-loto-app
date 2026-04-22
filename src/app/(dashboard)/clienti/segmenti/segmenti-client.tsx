"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import { Crown, UserX, UserPlus, Users, Sparkles, RefreshCw, Check } from "lucide-react";
import { formatCurrency, formatPhone } from "@/lib/utils";
import type { TableRow } from "@/types/database";
import {
  bulkUpdateSegmento,
  autoClassifyClients,
} from "@/lib/actions/client-segments";

type Client = TableRow<"clients">;

type Segmento = "lead" | "nuova" | "lotina" | "inattiva" | "vip";
const ALL_SEGMENTS: Segmento[] = ["lead", "nuova", "lotina", "inattiva", "vip"];

const SEG_META: Record<
  Segmento,
  {
    label: string;
    description: string;
    icon: typeof Users;
    variant: "default" | "primary" | "success" | "warning" | "danger" | "outline";
  }
> = {
  lead: {
    label: "Lead",
    description: "Prospect senza visita > 30 giorni",
    icon: UserPlus,
    variant: "outline",
  },
  nuova: {
    label: "Nuove",
    description: "Inserite di recente, ancora in onboarding",
    icon: Sparkles,
    variant: "primary",
  },
  lotina: {
    label: "Lotine",
    description: "Clienti regolari con almeno una visita YTD",
    icon: Users,
    variant: "success",
  },
  inattiva: {
    label: "Inattive",
    description: "Nessuna visita da oltre 90 giorni",
    icon: UserX,
    variant: "warning",
  },
  vip: {
    label: "VIP",
    description: "≥12 visite YTD oppure ≥€1.500 spesi nell'anno",
    icon: Crown,
    variant: "danger",
  },
};

interface Props {
  clients: Client[];
  stats: {
    total: number;
    counts: Record<Segmento, number>;
    percents: Record<Segmento, number>;
  };
}

export default function SegmentiClient({ clients, stats }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Segmento>("vip");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const clientsBySeg = useMemo(() => {
    const grouped: Record<Segmento, Client[]> = {
      lead: [],
      nuova: [],
      lotina: [],
      inattiva: [],
      vip: [],
    };
    for (const c of clients) {
      const seg = (c.segmento || "nuova") as Segmento;
      if (ALL_SEGMENTS.includes(seg)) grouped[seg].push(c);
      else grouped.nuova.push(c);
    }
    return grouped;
  }, [clients]);

  const currentList = clientsBySeg[activeTab];
  const allSelectedInTab =
    currentList.length > 0 && currentList.every((c) => selected.has(c.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllInTab() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelectedInTab) {
        for (const c of currentList) next.delete(c.id);
      } else {
        for (const c of currentList) next.add(c.id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleBulkMove(target: Segmento) {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const label = SEG_META[target].label;
    if (
      !window.confirm(
        `Sposta ${ids.length} client${ids.length === 1 ? "e" : "i"} al segmento "${label}"?`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await bulkUpdateSegmento(ids, target);
      if (res.errors.length > 0) {
        showToast(`Errore: ${res.errors.join("; ")}`);
        return;
      }
      showToast(`${res.updated} client${res.updated === 1 ? "e" : "i"} aggiornat${res.updated === 1 ? "a" : "i"}.`);
      clearSelection();
      router.refresh();
    });
  }

  function handleReclassify() {
    if (
      !window.confirm(
        "Riclassifica TUTTI i clienti secondo le regole automatiche? L'operazione è sicura e reversibile manualmente."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await autoClassifyClients();
      if (res.errors.length > 0) {
        showToast(`Completato con errori: ${res.changed}/${res.classified} modificati · ${res.errors.join("; ")}`);
      } else {
        showToast(
          `${res.changed} client${res.changed === 1 ? "e" : "i"} riclassificat${res.changed === 1 ? "a" : "i"} (su ${res.classified}).`
        );
      }
      clearSelection();
      router.refresh();
    });
  }

  return (
    <>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suddivisioni clienti</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.total} clienti totali · classificazione automatica basata su visite e spesa YTD.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleReclassify}
          disabled={pending}
        >
          <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
          {pending ? "Elaboro…" : "Riclassifica tutti"}
        </Button>
      </header>

      {/* 5 segment cards */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ALL_SEGMENTS.map((seg) => {
          const meta = SEG_META[seg];
          const Icon = meta.icon;
          const count = stats.counts[seg];
          const pct = stats.percents[seg];
          const isActive = activeTab === seg;
          return (
            <Card
              key={seg}
              onClick={() => setActiveTab(seg)}
              className={`cursor-pointer transition-colors hover:bg-muted/40 ${
                isActive ? "border-primary ring-1 ring-primary/50" : ""
              }`}
            >
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold tabular-nums">{count}</div>
                <div className="text-xs text-muted-foreground">
                  {pct.toFixed(1)}% del totale
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {meta.description}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Segmento)}>
        <TabsList className="mb-2 flex flex-wrap">
          {ALL_SEGMENTS.map((seg) => (
            <TabsTrigger key={seg} value={seg}>
              {SEG_META[seg].label} · {stats.counts[seg]}
            </TabsTrigger>
          ))}
        </TabsList>

        {ALL_SEGMENTS.map((seg) => (
          <TabsContent key={seg} value={seg}>
            <Card className="overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="w-10 px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          aria-label="Seleziona tutti"
                          checked={allSelectedInTab}
                          onChange={toggleAllInTab}
                          className="h-4 w-4 rounded border-border"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-medium">Cliente</th>
                      <th className="px-4 py-3 text-left font-medium">Telefono</th>
                      <th className="px-4 py-3 text-right font-medium">Totale speso</th>
                      <th className="px-4 py-3 text-right font-medium">Visite</th>
                      <th className="px-4 py-3 text-right font-medium">Ultima visita</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {clientsBySeg[seg].length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          Nessun cliente in questo segmento.
                        </td>
                      </tr>
                    ) : (
                      clientsBySeg[seg].map((c) => {
                        const checked = selected.has(c.id);
                        return (
                          <tr
                            key={c.id}
                            className={`transition-colors ${
                              checked ? "bg-primary/5" : "hover:bg-muted/40"
                            }`}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleOne(c.id)}
                                aria-label={`Seleziona ${c.nome} ${c.cognome}`}
                                className="h-4 w-4 rounded border-border"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  name={`${c.nome} ${c.cognome}`}
                                  size="sm"
                                  color="#C97A7A"
                                />
                                <Link
                                  href={`/clienti/${c.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {c.nome} {c.cognome}
                                </Link>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {c.telefono ? formatPhone(c.telefono) : "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {formatCurrency(c.totale_speso ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {c.totale_visite ?? 0}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {c.ultima_visita
                                ? new Date(c.ultima_visita).toLocaleDateString(
                                    "it-IT",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    }
                                  )
                                : "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Bulk action bar (sticky bottom when selection active) */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-lg">
          <span className="text-sm font-medium">
            {selected.size} selezionat{selected.size === 1 ? "a" : "e"}
          </span>
          <div className="mx-2 h-4 w-px bg-border" />
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleBulkMove("vip")}
            disabled={pending}
          >
            <Crown className="h-3.5 w-3.5" /> VIP
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkMove("inattiva")}
            disabled={pending}
          >
            <UserX className="h-3.5 w-3.5" /> Inattiva
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkMove("lotina")}
            disabled={pending}
          >
            <Users className="h-3.5 w-3.5" /> Lotina
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkMove("nuova")}
            disabled={pending}
          >
            Nuova
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearSelection}
            disabled={pending}
          >
            Annulla
          </Button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-lg">
          <Check className="h-4 w-4 text-success" />
          {toast}
        </div>
      )}
    </>
  );
}
