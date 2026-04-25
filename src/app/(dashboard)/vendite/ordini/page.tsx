export const dynamic = "force-dynamic";

import Link from "next/link";
import { Badge, Card, CardContent } from "@/components/ui";
import { getProductSales } from "@/lib/actions/vendite";
import { VenditeTable, type VenditeTableColumn } from "@/components/vendite/vendite-table";
import { MonthSelector } from "@/components/vendite/month-selector";
import { formatCurrency } from "@/lib/utils";
import type { ProductSaleRow } from "@/lib/actions/vendite";
import { Package, ShoppingBag, Receipt } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isValidMonth(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}$/.test(s);
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map((p) => parseInt(p, 10));
  const d = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(d);
}

export default async function VenditeOrdiniPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const month = isValidMonth(sp.month) ? sp.month : currentMonth();

  const rows = await getProductSales(month);

  const totaleFatturato = rows.reduce((s, r) => s + r.totalRow, 0);

  const columns: VenditeTableColumn<ProductSaleRow>[] = [
    {
      key: "data",
      header: "Data",
      cell: (r) => new Date(r.data).toLocaleDateString("it-IT"),
    },
    {
      key: "cliente",
      header: "Cliente",
      cell: (r) =>
        r.clientId && r.clientName ? (
          <Link
            href={`/clienti/${r.clientId}`}
            className="font-medium text-primary hover:underline"
          >
            {r.clientName}
          </Link>
        ) : (
          <span className="text-muted-foreground">{r.clientName ?? "—"}</span>
        ),
    },
    {
      key: "prodotto",
      header: "Prodotto",
      cell: (r) => <span className="text-foreground">{r.productLabel}</span>,
    },
    {
      key: "quantity",
      header: "Q.tà",
      align: "center",
      cell: (r) => <span>{r.quantity}</span>,
    },
    {
      key: "unitPrice",
      header: "Prezzo unit.",
      align: "right",
      cell: (r) => (
        <span className="text-muted-foreground">
          {formatCurrency(r.unitPrice)}
        </span>
      ),
    },
    {
      key: "totalRow",
      header: "Totale",
      align: "right",
      cell: (r) => (
        <span className="font-semibold">{formatCurrency(r.totalRow)}</span>
      ),
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
  ];

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Ordini di prodotti</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vendite di prodotti da cassa e checkout — {formatMonthLabel(month)}.
        </p>
      </header>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Ordini nel mese
              </p>
              <p className="text-2xl font-semibold">{rows.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Fatturato del mese
              </p>
              <p className="text-2xl font-semibold">
                {formatCurrency(totaleFatturato)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <MonthSelector value={month} />

      <VenditeTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        emptyMessage={
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Package className="h-6 w-6" />
            </div>
            <p>Nessun ordine di prodotti in {formatMonthLabel(month)}.</p>
          </div>
        }
        footer={
          rows.length > 0 ? (
            <tr>
              <td className="px-4 py-3 text-muted-foreground" colSpan={5}>
                Totale {rows.length} {rows.length === 1 ? "riga" : "righe"}
              </td>
              <td className="px-4 py-3 text-right font-semibold">
                {formatCurrency(totaleFatturato)}
              </td>
              <td className="px-4 py-3" />
            </tr>
          ) : null
        }
      />
    </>
  );
}
