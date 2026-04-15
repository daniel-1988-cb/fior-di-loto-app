export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { getClients } from "@/lib/actions/clients";
import { LABELS } from "@/lib/constants/italian";
import { ClientList } from "@/components/clienti/client-list";

export default async function ClientiPage({
 searchParams,
}: {
 searchParams: Promise<{ segmento?: string; q?: string }>;
}) {
 const params = await searchParams;
 // Passa il segmento iniziale per il filtro visivo, ma carica tutti i clienti
 // così il filtro e la ricerca avvengono lato client senza round-trip
 const initialSegmento = params.segmento || "tutti";
 const initialSearch = params.q || "";

 // Carica sempre tutti i clienti — il filtro è client-side
 const clienti = await getClients();

 return (
  <div>
   {/* Header */}
   <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
     <h1 className="font-display text-3xl font-bold text-brown">
      {LABELS.clienti.titolo}
     </h1>
     <p className="mt-1 text-sm text-muted-foreground">
      {clienti.length} clienti
     </p>
    </div>
    <Link
     href="/clienti/nuovo"
     className="inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-dark"
    >
     <Plus className="h-4 w-4" />
     {LABELS.clienti.nuovoCliente}
    </Link>
   </div>

   <ClientList
    initialClients={clienti as unknown as Parameters<typeof ClientList>[0]["initialClients"]}
    initialSegmento={initialSegmento}
    initialSearch={initialSearch}
   />
  </div>
 );
}
