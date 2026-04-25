import { formatCurrency } from "@/lib/utils";
import type { ClientProfileSummary } from "@/lib/actions/clients";

export function PanoramicaTab({
  summary,
  walletBalance = 0,
}: {
  summary: ClientProfileSummary;
  walletBalance?: number;
}) {
  return (
    <div className="space-y-8">
      {/* Portafoglio */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-brown">Portafoglio</h3>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Saldo</p>
          <p className="mt-1 text-2xl font-semibold text-brown">
            {formatCurrency(walletBalance)}
          </p>
        </div>
      </section>

      {/* Riepilogo */}
      <section>
        <h3 className="mb-3 text-base font-semibold text-brown">Riepilogo</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Totale delle vendite"
            value={formatCurrency(summary.venditeTotale)}
          />
          <StatCard
            label="Appuntamenti"
            value={String(summary.appuntamentiTotali)}
          />
          <StatCard
            label="Valutazione"
            value="—"
          />
          <StatCard
            label="Annullato"
            value={String(summary.appuntamentiAnnullati)}
          />
          <StatCard
            label="Mancata presentazione"
            value={String(summary.appuntamentiNoShow)}
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-brown">{value}</p>
    </div>
  );
}
