"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import {
  Input,
  Avatar,
  Badge,
  Card,
} from "@/components/ui";
import { ClientDrawer } from "./client-drawer";
import { formatCurrency, formatPhone } from "@/lib/utils";
import type { TableRow } from "@/types/database";

type Client = TableRow<"clients">;

export function ClientsTable({ clients }: { clients: Client[] }) {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter((c) =>
      `${c.nome} ${c.cognome} ${c.telefono ?? ""} ${c.email ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [clients, search]);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-border p-4">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nome, email o telefono"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filtered.length} di {clients.length}
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Cliente</th>
              <th className="px-4 py-3 text-left font-medium">Telefono</th>
              <th className="px-4 py-3 text-left font-medium">Segmento</th>
              <th className="px-4 py-3 text-right font-medium">Totale speso</th>
              <th className="px-4 py-3 text-right font-medium">Visite</th>
              <th className="px-4 py-3 text-right font-medium">Creato il</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nessun cliente trovato.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setActive(c)}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${c.nome} ${c.cognome}`} size="sm" color="#C97A7A" />
                      <span className="font-medium">
                        {c.nome} {c.cognome}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.telefono ? formatPhone(c.telefono) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{c.segmento}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCurrency(c.totale_speso ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right">{c.totale_visite ?? 0}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ClientDrawer client={active} onClose={() => setActive(null)} />
    </Card>
  );
}
