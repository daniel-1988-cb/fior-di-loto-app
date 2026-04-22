export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui";
import { ArrowUpRight } from "lucide-react";
import { getAppuntamentiPagati, type AppuntamentoPagato } from "@/lib/actions/vendite";
import { VenditeTable, type VenditeTableColumn } from "@/components/vendite/vendite-table";
import { formatCurrency } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

function defaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  return { from: iso(start), to: iso(end) };
}

export default async function VenditeAppuntamentiPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const def = defaultRange();
  const from = sp.from || def.from;
  const to = sp.to || def.to;

  const rows = await getAppuntamentiPagati({ dataFrom: from, dataTo: to });
  const totale = rows.reduce((s, r) => s + r.importo, 0);

  const columns: VenditeTableColumn<AppuntamentoPagato>[] = [
    {
      key: "data",
      header: "Data",
      cell: (r) => new Date(r.data).toLocaleDateString("it-IT"),
    },
    {
      key: "ora",
      header: "Ora",
      cell: (r) => <span className="text-muted-foreground">{r.oraInizio}</span>,
    },
    {
      key: "cliente",
      header: "Cliente",
      cell: (r) => <span className="font-medium">{r.clienteNome}</span>,
    },
    {
      key: "servizio",
      header: "Servizio",
      cell: (r) => r.servizioNome,
    },
    {
      key: "staff",
      header: "Staff",
      cell: (r) => (
        <span className="text-muted-foreground">{r.staffNome ?? "—"}</span>
      ),
    },
    {
      key: "importo",
      header: "Importo",
      align: "right",
      cell: (r) => (
        <span className="font-semibold text-success">
          {formatCurrency(r.importo)}
        </span>
      ),
    },
    {
      key: "azioni",
      header: "",
      align: "right",
      cell: (r) => (
        <Link href={`/agenda?date=${r.data}`}>
          <Button variant="outline" size="sm">
            Vai a ricevuta
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Appuntamenti pagati</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} appuntamenti incassati dal{" "}
          {new Date(from).toLocaleDateString("it-IT")} al{" "}
          {new Date(to).toLocaleDateString("it-IT")} · Totale{" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(totale)}
          </span>
          .
        </p>
      </header>

      <VenditeTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        emptyMessage="Nessun appuntamento pagato nel periodo selezionato."
      />
    </>
  );
}
