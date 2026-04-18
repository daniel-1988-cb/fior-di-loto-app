export const dynamic = "force-dynamic";

import { marketingSubNav } from "@/components/layout/v2-sidenav";
import { Card, Badge } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function V2CronologiaPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("sent_messages")
    .select("*, clients(nome, cognome), message_templates(nome)")
    .order("inviato_at", { ascending: false })
    .limit(200);

  const rows = data ?? [];

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Cronologia messaggi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} messaggi inviati (ultimi 200).
        </p>
      </header>

      <Card className="overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Canale</th>
                <th className="px-4 py-3 text-left font-medium">Template</th>
                <th className="px-4 py-3 text-left font-medium">Contenuto</th>
                <th className="px-4 py-3 text-center font-medium">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nessun messaggio inviato.
                  </td>
                </tr>
              ) : (
                rows.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(m.inviato_at).toLocaleString("it-IT")}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {m.clients?.nome} {m.clients?.cognome}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="uppercase">
                        {m.canale}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.message_templates?.nome ?? "—"}
                    </td>
                    <td className="px-4 py-3 max-w-md truncate text-muted-foreground">
                      {m.contenuto}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={
                          m.stato === "inviato"
                            ? "success"
                            : m.stato === "errore"
                            ? "danger"
                            : "default"
                        }
                      >
                        {m.stato}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
