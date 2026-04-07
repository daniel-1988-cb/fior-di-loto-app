export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus, Clock, Euro, Pencil } from "lucide-react";
import { getServices } from "@/lib/actions/services";
import { formatCurrency } from "@/lib/utils";
import { LABELS } from "@/lib/constants/italian";

type Service = {
  id: string;
  nome: string;
  categoria: string;
  descrizione: string | null;
  durata: number;
  prezzo: number;
  attivo: boolean;
};

const categoriaOrder = ["viso", "corpo", "massaggi", "laser", "spa"];

function getCategoriaLabel(cat: string) {
  return LABELS.categorie[cat as keyof typeof LABELS.categorie] || cat;
}

function getCategoriaStyle(cat: string) {
  switch (cat) {
    case "viso": return "bg-rose/10 text-rose-dark";
    case "corpo": return "bg-gold/10 text-gold-dark";
    case "massaggi": return "bg-success/10 text-success";
    case "laser": return "bg-info/10 text-info";
    case "spa": return "bg-purple-100 text-purple-700";
    default: return "bg-muted text-muted-foreground";
  }
}

export default async function ServiziPage() {
  const services = await getServices() as unknown as Service[];

  // Group by categoria
  const grouped: Record<string, Service[]> = {};
  for (const s of services) {
    if (!grouped[s.categoria]) grouped[s.categoria] = [];
    grouped[s.categoria].push(s);
  }

  const sortedCategorie = categoriaOrder.filter((c) => grouped[c]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
            Servizi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {services.length} servizi attivi
          </p>
        </div>
        <Link
          href="/servizi/nuovo"
          className="inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-dark"
        >
          <Plus className="h-4 w-4" />
          Nuovo Servizio
        </Link>
      </div>

      {services.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Nessun servizio attivo</p>
          <Link
            href="/servizi/nuovo"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:bg-rose-dark"
          >
            <Plus className="h-4 w-4" />
            Aggiungi Servizio
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedCategorie.map((categoria) => (
            <div key={categoria}>
              <div className="mb-4 flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getCategoriaStyle(categoria)}`}
                >
                  {getCategoriaLabel(categoria)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {grouped[categoria].length} serviz{grouped[categoria].length === 1 ? "io" : "i"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[categoria].map((service) => (
                  <div
                    key={service.id}
                    className="rounded-xl border border-border bg-card p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-brown">{service.nome}</h3>
                      <Link
                        href={`/servizi/${service.id}/modifica`}
                        className="shrink-0 rounded-lg border border-border bg-card p-1.5 text-muted-foreground hover:border-rose/30 hover:text-rose"
                        title="Modifica"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    {service.descrizione && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {service.descrizione}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{service.durata} min</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-semibold text-brown">
                        <Euro className="h-3.5 w-3.5" />
                        <span>{formatCurrency(Number(service.prezzo))}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
