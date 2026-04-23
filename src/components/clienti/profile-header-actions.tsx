"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { ClientActivityMenu } from "@/components/v2/client-activity-menu";
import type { TableRow } from "@/types/database";

type Client = TableRow<"clients">;

type Props = {
 client: Client;
};

/**
 * Client-side island embedded nel server component `/clienti/[id]/page.tsx`.
 * Monta il menu Attività (prompt-based quick actions) + il bottone "Prenota
 * ora" come un unico blocco interattivo sotto l'avatar del profilo.
 */
export function ProfileHeaderActions({ client }: Props) {
 const router = useRouter();

 function handleDeleted() {
  router.push("/clienti");
 }

 return (
  <div className="mt-5 grid grid-cols-2 gap-2">
   <ClientActivityMenu
    client={client}
    onUpdate={() => router.refresh()}
    onDeleted={handleDeleted}
    onEdit={() => router.push(`/clienti/${client.id}/modifica`)}
   />
   <Link
    href={`/agenda/nuovo?clientId=${client.id}`}
    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose px-3 py-2 text-sm font-medium text-white hover:bg-rose-dark"
   >
    <CalendarPlus className="h-4 w-4" />
    Prenota ora
   </Link>
  </div>
 );
}
