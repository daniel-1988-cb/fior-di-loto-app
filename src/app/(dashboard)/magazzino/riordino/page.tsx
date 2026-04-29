export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, Package, AlertCircle, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { getReorderSuggestions } from "@/lib/actions/reorder-suggestions";
import { ReorderTable } from "./reorder-table";
import { formatCurrency } from "@/lib/utils";

export default async function RiordinoPage() {
  const suggestions = await getReorderSuggestions();
  const critical = suggestions.filter((s) => s.urgency === "critical").length;
  const high = suggestions.filter((s) => s.urgency === "high").length;
  const medium = suggestions.filter((s) => s.urgency === "medium").length;
  const totalValue = suggestions.reduce(
    (sum, s) => sum + s.suggestedReorderValue,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/catalogo/inventario"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Magazzino
        </Link>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl text-foreground">
          Riordino consigliato
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calcolato sulla velocità di consumo storica (ultimi 90 giorni). Copertura
          target: 60 giorni.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Da riordinare"
          value={suggestions.length.toString()}
          icon={<Package className="h-4 w-4" />}
        />
        <StatCard
          label="Esauriti"
          value={critical.toString()}
          icon={<AlertCircle className="h-4 w-4 text-danger" />}
          danger={critical > 0}
        />
        <StatCard
          label="Sotto 7 giorni"
          value={(critical + high).toString()}
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <StatCard
          label="Valore stimato"
          value={formatCurrency(totalValue)}
          icon={<Package className="h-4 w-4" />}
        />
      </div>

      {/* Table */}
      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-base font-semibold">Nessun riordino consigliato 🪷</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tutti i prodotti hanno copertura sufficiente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ReorderTable suggestions={suggestions} />
      )}

      {/* Footnote */}
      <p className="text-xs text-muted-foreground">
        Lo storico vendite considerato copre {suggestions[0]?.observationDays ?? 90}{" "}
        giorni. Più storico hai, più precise sono le proiezioni — re-importa Fresha
        per estendere il range. Le quantità suggerite sono indicative: rivedile
        sempre prima di ordinare.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  danger = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <span className={danger ? "text-danger" : "text-muted-foreground"}>
            {icon}
          </span>
        </div>
        <p
          className={`mt-2 text-2xl font-semibold ${danger ? "text-danger" : ""}`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
