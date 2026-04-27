export const dynamic = "force-dynamic";

import Link from "next/link";
import { clientiSubNav } from "@/components/layout/v2-sidenav";
import { Button } from "@/components/ui";
import { Plus, Download } from "lucide-react";
import { ClientsTable } from "@/components/v2/clients-table";
import { getClients } from "@/lib/actions/clients";
import { isValidSegmento } from "@/lib/security/validate";

interface Props {
  searchParams: Promise<{
    segmento?: string;
    search?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function V2ClientiPage({ searchParams }: Props) {
  const params = await searchParams;
  const safeSeg =
    params.segmento && params.segmento !== "tutti" && isValidSegmento(params.segmento)
      ? params.segmento
      : undefined;
  const safeSearch = params.search?.slice(0, 100) || undefined;

  const clients = await getClients(safeSeg, safeSearch);

  // Build export URL preserving the active filters.
  const exportParams = new URLSearchParams();
  if (safeSeg) exportParams.set("segmento", safeSeg);
  if (safeSearch) exportParams.set("search", safeSearch);
  if (params.from) exportParams.set("from", params.from);
  if (params.to) exportParams.set("to", params.to);
  const exportHref = `/clienti/export${
    exportParams.toString() ? `?${exportParams.toString()}` : ""
  }`;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Elenco clienti</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clients.length} clienti
            {safeSeg ? ` · segmento: ${safeSeg}` : " totali"} · visualizza, aggiungi
            e modifica anagrafiche.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={exportHref} prefetch={false}>
            <Button variant="outline">
              <Download className="h-4 w-4" /> Esporta CSV
            </Button>
          </Link>
          <Link href="/clienti/nuovo">
            <Button>
              <Plus className="h-4 w-4" /> Aggiungi
            </Button>
          </Link>
        </div>
      </header>

      <ClientsTable clients={clients} />
    </>
  );
}
