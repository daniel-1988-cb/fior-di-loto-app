export const dynamic = "force-dynamic";

import { V2Shell } from "@/components/layout/v2-shell";
import { catalogoSubNav } from "@/components/layout/v2-sidenav";
import { Card, Button, Badge } from "@/components/ui";
import { Plus, Gift } from "lucide-react";
import { getVouchers } from "@/lib/actions/vouchers";
import { formatCurrency } from "@/lib/utils";

export default async function V2CatalogoVoucherPage() {
  const vouchers = await getVouchers();

  const active = vouchers.filter((v) => !v.usato);
  const used = vouchers.filter((v) => v.usato);
  const total = active.reduce((s, v) => s + v.valore, 0);

  return (
    <V2Shell subNav={{ title: "Catalogo", groups: catalogoSubNav }}>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buoni</h1>
          <p className="mt-1 text-sm text-muted-foreground">Buoni regalo emessi dal centro.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> Aggiungi
        </Button>
      </header>

      <section className="mb-6 grid gap-3 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Buoni attivi</p>
          <p className="mt-1 text-2xl font-bold">{active.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Valore attivo</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(total)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Utilizzati</p>
          <p className="mt-1 text-2xl font-bold">{used.length}</p>
        </Card>
      </section>

      {vouchers.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Gift className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Ancora nessun buono emesso.</p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Codice</th>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-right font-medium">Valore</th>
                  <th className="px-4 py-3 text-center font-medium">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vouchers.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3 font-mono text-xs">{v.codice}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{v.tipo}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(v.valore)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={v.usato ? "default" : "success"}>
                        {v.usato ? "Utilizzato" : "Valido"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </V2Shell>
  );
}
