export const dynamic = "force-dynamic";

import { Badge } from "@/components/ui";
import { getVoucherList, type VoucherListItem } from "@/lib/actions/vendite";
import { VenditeTable, type VenditeTableColumn } from "@/components/vendite/vendite-table";
import { VoucherToolbar } from "@/components/vendite/voucher-toolbar";
import { formatCurrency } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ stato?: string }>;
}

const VALID_STATI = ["attivo", "usato", "scaduto", "all"] as const;

export default async function VenditeVoucherPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const stato = (VALID_STATI as readonly string[]).includes(sp.stato || "")
    ? (sp.stato as (typeof VALID_STATI)[number])
    : "attivo";

  const rows = await getVoucherList({ stato });

  const today = new Date().toISOString().slice(0, 10);

  const statoLabel = (v: VoucherListItem) => {
    if (v.usato) return { label: "Usato", variant: "default" as const };
    if (v.dataScadenza && v.dataScadenza < today)
      return { label: "Scaduto", variant: "warning" as const };
    return { label: "Attivo", variant: "success" as const };
  };

  const columns: VenditeTableColumn<VoucherListItem>[] = [
    {
      key: "codice",
      header: "Codice",
      cell: (v) => (
        <span className="font-mono text-xs">{v.codice}</span>
      ),
    },
    {
      key: "tipo",
      header: "Tipo",
      cell: (v) => <Badge variant="outline">{v.tipo}</Badge>,
    },
    {
      key: "valore",
      header: "Valore",
      align: "right",
      cell: (v) => (
        <span className="font-semibold">{formatCurrency(v.valore)}</span>
      ),
    },
    {
      key: "cliente",
      header: "Cliente",
      cell: (v) => v.clienteNome ?? "—",
    },
    {
      key: "emissione",
      header: "Emesso",
      cell: (v) => new Date(v.dataEmissione).toLocaleDateString("it-IT"),
    },
    {
      key: "scadenza",
      header: "Scadenza",
      cell: (v) => (
        <span className="text-muted-foreground">
          {v.dataScadenza
            ? new Date(v.dataScadenza).toLocaleDateString("it-IT")
            : "—"}
        </span>
      ),
    },
    {
      key: "stato",
      header: "Stato",
      align: "center",
      cell: (v) => {
        const s = statoLabel(v);
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
  ];

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Voucher emessi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} voucher ({statoDescription(stato)}).
        </p>
      </header>

      <VoucherToolbar initialStato={stato} />

      <VenditeTable
        columns={columns}
        rows={rows}
        rowKey={(v) => v.id}
        emptyMessage="Nessun voucher in questo stato."
        onRowClickAttrs={(v) => ({
          "data-voucher-codice": v.codice,
          role: "button",
          tabIndex: "0",
        })}
      />
    </>
  );
}

function statoDescription(s: string): string {
  switch (s) {
    case "attivo":
      return "attivi";
    case "usato":
      return "usati";
    case "scaduto":
      return "scaduti";
    default:
      return "tutti";
  }
}
