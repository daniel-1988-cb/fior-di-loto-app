export const dynamic = "force-dynamic";

import { ExportSection } from "@/components/impostazioni/export-section";

export default function ImpostazioniPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
          Impostazioni
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Configurazione del gestionale</p>
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
