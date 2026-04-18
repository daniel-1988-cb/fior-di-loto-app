export const dynamic = "force-dynamic";

import { V2Shell } from "@/components/layout/v2-shell";
import { clientiSubNav } from "@/components/layout/v2-sidenav";
import { Button } from "@/components/ui";
import { Plus } from "lucide-react";
import { ClientsTable } from "@/components/v2/clients-table";
import { getClients } from "@/lib/actions/clients";
import type { TableRow } from "@/types/database";

export default async function V2ClientiPage() {
  const clients = (await getClients()) as unknown as TableRow<"clients">[];

  return (
    <V2Shell subNav={{ title: "Clienti", groups: clientiSubNav }}>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Elenco clienti</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clients.length} clienti totali · visualizza, aggiungi e modifica anagrafiche.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> Aggiungi
        </Button>
      </header>

      <ClientsTable clients={clients} />
    </V2Shell>
  );
}
