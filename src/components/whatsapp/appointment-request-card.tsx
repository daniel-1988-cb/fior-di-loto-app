"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X, ExternalLink, ChevronRight } from "lucide-react";
import {
 updateAppointmentRequestStatus,
 type AppointmentRequestListItem,
} from "@/lib/actions/appointment-requests";

type Props = { req: AppointmentRequestListItem };

export function AppointmentRequestCard({ req }: Props) {
 const router = useRouter();
 const [pending, startTransition] = useTransition();
 const [note, setNote] = useState(req.noteOperatore ?? "");
 const [showNote, setShowNote] = useState(false);

 function act(stato: "scheduled" | "rejected") {
  startTransition(async () => {
   const res = await updateAppointmentRequestStatus(req.id, stato, {
    noteOperatore: note.trim() || null,
   });
   if (res.ok) router.refresh();
   else alert("Errore: " + res.error);
  });
 }

 const createdAt = new Date(req.createdAt);
 const dateLabel = createdAt.toLocaleString("it-IT", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
 });

 return (
  <div className="rounded-lg border border-border bg-card p-4">
   <div className="flex items-start justify-between gap-4">
    <div className="min-w-0 flex-1">
     <div className="flex items-center gap-2">
      <Link
       href={`/clienti/${req.clientId}`}
       className="font-medium text-brown hover:text-rose"
      >
       {req.clientName}
      </Link>
      {req.clientPhone && (
       <span className="text-xs text-muted-foreground">{req.clientPhone}</span>
      )}
     </div>
     <p className="mt-2 whitespace-pre-wrap text-sm text-brown">
      {req.testoRichiesta}
     </p>
     <p className="mt-2 text-xs text-muted-foreground">{dateLabel}</p>
    </div>
    <Link
     href={`/whatsapp/conversazioni/${req.clientId}`}
     className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-rose hover:text-rose"
     title="Apri chat"
    >
     Chat
     <ChevronRight className="h-3 w-3" />
    </Link>
   </div>

   {showNote && (
    <textarea
     value={note}
     onChange={(e) => setNote(e.target.value)}
     placeholder="Note interne (opzionale)"
     rows={2}
     className="mt-3 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-brown placeholder:text-muted-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/20"
    />
   )}

   <div className="mt-3 flex flex-wrap items-center gap-2">
    <Link
     href={`/agenda?clientId=${req.clientId}`}
     className="inline-flex items-center gap-1 rounded-lg bg-rose px-3 py-1.5 text-xs font-medium text-white hover:bg-rose/90"
    >
     <ExternalLink className="h-3 w-3" />
     Apri agenda
    </Link>
    <button
     type="button"
     onClick={() => act("scheduled")}
     disabled={pending}
     className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-50"
     title="Segna come prenotato"
    >
     <Check className="h-3 w-3" />
     Prenotato
    </button>
    <button
     type="button"
     onClick={() => act("rejected")}
     disabled={pending}
     className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:border-red-500 hover:text-red-600 disabled:opacity-50"
    >
     <X className="h-3 w-3" />
     Rifiuta
    </button>
    <button
     type="button"
     onClick={() => setShowNote((v) => !v)}
     className="ml-auto text-xs text-muted-foreground hover:text-brown"
    >
     {showNote ? "Nascondi note" : "Aggiungi nota"}
    </button>
   </div>
  </div>
 );
}
