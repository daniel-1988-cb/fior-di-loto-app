export const dynamic = "force-dynamic";

import Link from "next/link";
import { Badge, Card, CardContent } from "@/components/ui";
import { getSubscriptionSales } from "@/lib/actions/vendite";
import { VenditeTable, type VenditeTableColumn } from "@/components/vendite/vendite-table";
import { MonthSelector } from "@/components/vendite/month-selector";
import { formatCurrency } from "@/lib/utils";
import type { SubscriptionSaleRow } from "@/lib/actions/vendite";
import { Sparkles, Repeat, Receipt } from "lucide-react";

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

export default async function VenditeAbbonamentiPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const month = isValidMonth(sp.month) ? sp.month : currentMonth();

  const rows = await getSubscriptionSales(month);

  const totaleFatturato = rows.reduce((s, r) => s + r.prezzo, 0);

  const columns: VenditeTableColumn<SubscriptionSaleRow>[] = [
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
      key: "subscription",
      header: "Abbonamento",
      cell: (r) => <span className="text-foreground">{r.subscriptionName}</span>,
    },
    {
      key: "sedute",
      header: "Sedute",
      align: "center",
      cell: (r) =>
        r.seduteTotali != null ? (
          <span>{r.seduteTotali}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "prezzo",
      header: "Prezzo",
      align: "right",
      cell: (r) => (
        <span className="font-semibold">{formatCurrency(r.prezzo)}</span>
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
        <h1 className="text-3xl font-bold tracking-tight">Abbonamenti venduti</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pacchetti sedute venduti — {formatMonthLabel(month)}.
        </p>
      </header>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Abbonamenti nel mese
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
              <Sparkles className="h-6 w-6" />
            </div>
            <p>Nessun abbonamento venduto in {formatMonthLabel(month)}.</p>
          </div>
        }
        footer={
          rows.length > 0 ? (
            <tr>
              <td className="px-4 py-3 text-muted-foreground" colSpan={4}>
                Totale {rows.length} {rows.length === 1 ? "abbonamento" : "abbonamenti"}
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
