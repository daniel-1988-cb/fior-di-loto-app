export const dynamic = "force-dynamic";

import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { getTransazioniList } from "@/lib/actions/vendite";
import { VenditeTable, type VenditeTableColumn } from "@/components/vendite/vendite-table";
import { ListaFilters } from "@/components/vendite/lista-filters";
import { formatCurrency } from "@/lib/utils";
import type { TransazioneListItem } from "@/lib/actions/vendite";

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    metodo?: string;
    tipo?: string;
    page?: string;
  }>;
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

export default async function VenditeListaPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const def = defaultRange();
  const from = sp.from || def.from;
  const to = sp.to || def.to;
  const metodo = sp.metodo || "";
  const tipo = sp.tipo === "entrata" || sp.tipo === "uscita" ? sp.tipo : "";
  const page = Math.max(parseInt(sp.page || "1", 10) || 1, 1);

  const { rows, total } = await getTransazioniList({
    dataFrom: from,
    dataTo: to,
    metodo: metodo || undefined,
    tipo: tipo || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  // Aggregates on the filtered (not paginated) totals: quick computation from current page
  // is not accurate; we re-query numbers quickly.
  const { rows: allRows } = await getTransazioniList({
    dataFrom: from,
    dataTo: to,
    metodo: metodo || undefined,
    tipo: tipo || undefined,
    limit: 10000,
    offset: 0,
  });
  const tot = allRows.reduce(
    (acc, r) => {
      if (r.tipo === "entrata") acc.entrate += r.importo;
      else acc.uscite += r.importo;
      return acc;
    },
    { entrate: 0, uscite: 0 }
  );
  const net = tot.entrate - tot.uscite;

  const columns: VenditeTableColumn<TransazioneListItem>[] = [
    {
      key: "data",
      header: "Data",
      cell: (r) => new Date(r.data).toLocaleDateString("it-IT"),
    },
    {
      key: "descrizione",
      header: "Descrizione",
      cell: (r) => <span className="text-foreground">{r.descrizione || "—"}</span>,
    },
    {
      key: "cliente",
      header: "Cliente",
      cell: (r) => <span className="font-medium">{r.clienteNome ?? "—"}</span>,
    },
    {
      key: "metodo",
      header: "Metodo",
      cell: (r) =>
        r.metodoPagamento ? (
          <Badge variant="outline">{r.metodoPagamento}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "tipo",
      header: "Tipo",
      align: "center",
      cell: (r) => (
        <Badge variant={r.tipo === "entrata" ? "success" : "danger"}>
          {r.tipo}
        </Badge>
      ),
    },
    {
      key: "importo",
      header: "Importo",
      align: "right",
      cell: (r) => (
        <span
          className={`font-semibold ${
            r.tipo === "entrata" ? "text-success" : "text-danger"
          }`}
        >
          {r.tipo === "uscita" ? "-" : ""}
          {formatCurrency(r.importo)}
        </span>
      ),
    },
  ];

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (sp.from) params.set("from", sp.from);
    if (sp.to) params.set("to", sp.to);
    if (sp.metodo) params.set("metodo", sp.metodo);
    if (sp.tipo) params.set("tipo", sp.tipo);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/vendite/lista?${qs}` : "/vendite/lista";
  };

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Lista transazioni</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} movimenti dal {new Date(from).toLocaleDateString("it-IT")} al{" "}
          {new Date(to).toLocaleDateString("it-IT")}.
        </p>
      </header>

      <ListaFilters
        initialFrom={sp.from || ""}
        initialTo={sp.to || ""}
        initialMetodo={metodo}
        initialTipo={tipo}
      />

      <VenditeTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        emptyMessage="Nessuna transazione nel periodo selezionato."
        footer={
          rows.length > 0 ? (
            <tr>
              <td className="px-4 py-3 text-muted-foreground" colSpan={3}>
                Totale filtrato
              </td>
              <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                Entrate
              </td>
              <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                Uscite
              </td>
              <td className="px-4 py-3 text-right font-semibold">
                <span className="text-success">
                  {formatCurrency(tot.entrate)}
                </span>{" "}
                <span className="text-muted-foreground">/</span>{" "}
                <span className="text-danger">
                  -{formatCurrency(tot.uscite)}
                </span>{" "}
                <span className="text-muted-foreground">=</span>{" "}
                <span className={net >= 0 ? "text-success" : "text-danger"}>
                  {formatCurrency(net)}
                </span>
              </td>
            </tr>
          ) : null
        }
      />

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Pagina {page} di {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={buildHref(page - 1)}>
                <Button variant="outline" size="sm">
                  Precedente
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Precedente
              </Button>
            )}
            {page < totalPages ? (
              <Link href={buildHref(page + 1)}>
                <Button variant="outline" size="sm">
                  Successiva
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Successiva
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
