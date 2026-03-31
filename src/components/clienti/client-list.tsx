"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Phone,
  Mail,
  Filter,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { cn, formatPhone, formatDateShort } from "@/lib/utils";
import { LABELS } from "@/lib/constants/italian";

interface Client {
  id: string;
  nome: string;
  cognome: string;
  telefono: string | null;
  email: string | null;
  segmento: string;
  totale_visite: number;
  totale_speso: string;
  ultima_visita: string | null;
  tags: unknown;
}

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags as string[];
  if (typeof tags === "string") {
    try { return JSON.parse(tags) as string[]; } catch { return []; }
  }
  return [];
}

const segmenti = [
  { value: "tutti", label: LABELS.segmenti.tutti },
  { value: "lotina", label: LABELS.segmenti.lotina, color: "bg-gold/20 text-gold-dark" },
  { value: "nuova", label: LABELS.segmenti.nuova, color: "bg-success/20 text-success" },
  { value: "lead", label: LABELS.segmenti.lead, color: "bg-info/20 text-info" },
  { value: "vip", label: LABELS.segmenti.vip, color: "bg-rose/20 text-rose-dark" },
  { value: "inattiva", label: LABELS.segmenti.inattiva, color: "bg-muted text-muted-foreground" },
];

function getSegmentoStyle(segmento: string) {
  const found = segmenti.find((s) => s.value === segmento);
  return found?.color || "bg-muted text-muted-foreground";
}

function getSegmentoLabel(segmento: string) {
  const found = segmenti.find((s) => s.value === segmento);
  return found?.label || segmento;
}

export function ClientList({
  initialClients,
  initialSegmento,
  initialSearch,
}: {
  initialClients: Client[];
  initialSegmento: string;
  initialSearch: string;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [filtroSegmento, setFiltroSegmento] = useState(initialSegmento);

  function applyFilters(segmento: string, search: string) {
    const params = new URLSearchParams();
    if (segmento && segmento !== "tutti") params.set("segmento", segmento);
    if (search) params.set("q", search);
    router.push(`/clienti?${params.toString()}`);
  }

  function handleSegmentoChange(seg: string) {
    setFiltroSegmento(seg);
    applyFilters(seg, searchQuery);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    applyFilters(filtroSegmento, searchQuery);
  }

  return (
    <>
      {/* Search & Filters */}
      <div className="mb-6 space-y-4">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onBlur={() => applyFilters(filtroSegmento, searchQuery)}
            placeholder={LABELS.clienti.cerca}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2.5 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          <Filter className="h-4 w-4 self-center text-muted-foreground" />
          {segmenti.map((seg) => (
            <button
              key={seg.value}
              onClick={() => handleSegmentoChange(seg.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filtroSegmento === seg.value
                  ? "bg-rose text-white"
                  : "bg-card border border-border text-muted-foreground hover:bg-cream-dark"
              )}
            >
              {seg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Segment summary bar */}
      <div className="mb-4 flex gap-3 overflow-x-auto pb-1 text-xs">
        {segmenti.filter(s => s.value !== 'tutti').map(seg => {
          const count = initialClients.filter(c => c.segmento === seg.value).length;
          if (count === 0) return null;
          return (
            <button key={seg.value} onClick={() => handleSegmentoChange(seg.value)}
              className={`shrink-0 rounded-full px-3 py-1 font-medium ${seg.color}`}>
              {seg.label}: {count}
            </button>
          );
        })}
      </div>

      {/* Client List */}
      <div className="space-y-3">
        {initialClients.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              {LABELS.messaggi.nessunoTrovato}
            </p>
          </div>
        ) : (
          initialClients.map((client) => (
            <div
              key={client.id}
              onClick={() => router.push(`/clienti/${client.id}`)}
              className="group flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-rose/30 hover:shadow-sm"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose/10">
                <span className="text-lg font-semibold text-rose">
                  {client.nome[0]}
                  {client.cognome[0]}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-brown">
                    {client.nome} {client.cognome}
                  </h3>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      getSegmentoStyle(client.segmento)
                    )}
                  >
                    {getSegmentoLabel(client.segmento)}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {client.telefono && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {formatPhone(client.telefono)}
                    </span>
                  )}
                  {client.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {client.email}
                    </span>
                  )}
                </div>

                {parseTags(client.tags).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {parseTags(client.tags).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-cream-dark px-2 py-0.5 text-xs text-brown/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-sm font-semibold text-brown">
                  {"\u20ac"}{Number(client.totale_speso).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {client.totale_visite} visite
                </p>
                {client.ultima_visita && (
                  <p className="text-xs text-muted-foreground">
                    Ultima: {formatDateShort(client.ultima_visita)}
                  </p>
                )}
              </div>

              {client.telefono && (
                <a
                  href={`https://wa.me/39${client.telefono.replace(/\s/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hidden shrink-0 items-center gap-1 rounded-lg bg-success/10 px-2 py-1.5 text-xs font-medium text-success hover:bg-success/20 sm:flex"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WA
                </a>
              )}

              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
          ))
        )}
      </div>
    </>
  );
}
