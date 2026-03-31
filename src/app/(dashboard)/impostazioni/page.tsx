export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { ExportSection } from "@/components/impostazioni/export-section";
import { getStaff } from "@/lib/actions/staff";

export default async function ImpostazioniPage() {
  let staffList: Awaited<ReturnType<typeof getStaff>> = [];
  try {
    staffList = await getStaff();
  } catch {
    // Se la tabella non esiste ancora (migration non eseguita), mostra lista vuota
    staffList = [];
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
          Impostazioni
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Configurazione del gestionale</p>
      </div>

      {/* Gestione Personale */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-brown text-lg">Gestione Personale</h2>
          <Link
            href="/impostazioni/staff/nuovo"
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose px-3 py-2 text-sm font-medium text-white hover:bg-rose-dark"
          >
            <Plus className="h-4 w-4" />
            Aggiungi Operatrice
          </Link>
        </div>

        {staffList.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">
              Nessun membro dello staff trovato. Aggiungi la prima operatrice o esegui la migration del database.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {staffList.map((staff) => (
              <div
                key={staff.id}
                className="rounded-xl border bg-card p-4 shadow-sm"
                style={{ borderLeftColor: staff.colore, borderLeftWidth: 4 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: staff.colore }}
                  >
                    {staff.nome[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-brown truncate">{staff.nome} {staff.cognome || ""}</p>
                    <p className="text-xs text-muted-foreground capitalize">{staff.ruolo}</p>
                  </div>
                  <div className="ml-auto shrink-0">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        staff.attiva
                          ? "bg-green-100 text-green-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {staff.attiva ? "Attiva" : "Inattiva"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  ⏰ {staff.orario_inizio?.slice(0, 5)} – {staff.orario_fine?.slice(0, 5)}
                </p>
                {Number(staff.obiettivo_mensile) > 0 && (
                  <p className="text-xs text-muted-foreground mb-2">
                    🎯 Obiettivo: €{Number(staff.obiettivo_mensile).toFixed(0)}
                  </p>
                )}
                <div className="mt-3">
                  <Link
                    href={`/impostazioni/staff/${staff.id}`}
                    className="text-xs font-medium text-rose hover:underline"
                  >
                    Modifica →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Informazioni Centro */}
      <div className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-brown">Informazioni Centro</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-brown">Nome:</span> Fior di Loto
          </div>
          <div>
            <span className="font-medium text-brown">Sede:</span> Campobasso, CB
          </div>
          <div>
            <span className="font-medium text-brown">Metodo:</span> Metodo Rinascita
          </div>
        </div>
      </div>

      {/* Export / Backup */}
      <ExportSection />
    </div>
  );
}
