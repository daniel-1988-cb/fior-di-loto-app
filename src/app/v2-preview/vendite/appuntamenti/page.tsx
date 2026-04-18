export const dynamic = "force-dynamic";

import { V2Shell } from "@/components/layout/v2-shell";
import { venditeSubNav } from "@/components/layout/v2-sidenav";
import { Card, Badge } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";

export default async function V2VenditeAppuntamentiPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("appointments")
    .select("*, clients(nome, cognome), services(nome, prezzo)")
    .order("data", { ascending: false })
    .order("ora_inizio", { ascending: false })
    .limit(200);

  const rows = data ?? [];

  return (
    <V2Shell subNav={{ title: "Vendite", groups: venditeSubNav }}>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Appuntamenti</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tutti gli appuntamenti ordinati per data (ultimi 200).
        </p>
      </header>

      <Card className="overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3 text-left font-medium">Ora</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Servizio</th>
                <th className="px-4 py-3 text-right font-medium">Prezzo</th>
                <th className="px-4 py-3 text-center font-medium">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nessun appuntamento registrato.
                  </td>
                </tr>
              ) : (
                rows.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">{new Date(a.data).toLocaleDateString("it-IT")}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.ora_inizio.slice(0, 5)} - {a.ora_fine.slice(0, 5)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {a.clients?.nome} {a.clients?.cognome}
                    </td>
                    <td className="px-4 py-3">{a.services?.nome}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {a.services?.prezzo != null ? formatCurrency(a.services.prezzo) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={
                          a.stato === "confermato"
                            ? "success"
                            : a.stato === "completato"
                            ? "primary"
                            : a.stato === "cancellato"
                            ? "danger"
                            : "default"
                        }
                      >
                        {a.stato}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </V2Shell>
  );
}
