"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X, ChevronRight, CalendarX } from "lucide-react";
import {
 confirmCancellationRequest,
 rejectAppointmentRequest,
 type AppointmentRequestListItem,
} from "@/lib/actions/appointment-requests";

type Props = { req: AppointmentRequestListItem };

function fmtDateIt(yyyymmdd: string): string {
 const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd);
 if (!m) return yyyymmdd;
 const monthNames = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
 ];
 const mm = parseInt(m[2], 10);
 const dd = parseInt(m[3], 10);
 if (mm < 1 || mm > 12) return yyyymmdd;
 return `${dd} ${monthNames[mm - 1]}`;
}

export function CancellationRequestCard({ req }: Props) {
 const router = useRouter();
 const [pending, startTransition] = useTransition();
 const [showNote, setShowNote] = useState(false);
 const [note, setNote] = useState(req.noteOperatore ?? "");

 function doConfirm() {
  if (
   !confirm(
    "Confermare la cancellazione? L'appuntamento verrà segnato come cancellato e il cliente riceverà un WhatsApp di conferma.",
   )
  )
   return;
  startTransition(async () => {
   const res = await confirmCancellationRequest(req.id);
   if (res.ok) router.refresh();
   else alert("Errore: " + res.error);
  });
 }

 function doReject() {
  if (!confirm("Rifiutare la richiesta di cancellazione?")) return;
  startTransition(async () => {
   const res = await rejectAppointmentRequest(req.id, note.trim() || undefined);
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

 const ref = req.referencedAppointment;

 return (
  <div className="rounded-lg border border-rose-200 bg-rose-50/30 p-4">
   <div className="mb-2 flex items-center gap-2 text-xs font-medium text-rose-700">
    <CalendarX className="h-4 w-4" />
    Cancellazione richiesta
   </div>

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

   {ref ? (
    <div className="mt-3 rounded-md border border-border bg-card p-3 text-xs">
     <div className="font-medium text-muted-foreground">
      Appuntamento da cancellare
     </div>
     <div className="mt-1 text-brown">
      {fmtDateIt(ref.data)}, ore {ref.oraInizio}
      {ref.oraFine ? `–${ref.oraFine}` : ""}
      {ref.serviceName ? ` · ${ref.serviceName}` : ""}
      {ref.staffName ? ` · ${ref.staffName}` : ""}
     </div>
    </div>
   ) : (
    <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
     Appuntamento non identificato — chiedi al cliente di quale si tratta prima
     di confermare.
    </div>
   )}

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
    <button
     type="button"
     onClick={doConfirm}
     disabled={pending || !ref}
     className="inline-flex items-center gap-1 rounded-lg bg-rose px-3 py-2 text-sm font-medium text-white hover:bg-rose/90 disabled:opacity-50"
    >
     <Check className="h-3 w-3" />
     Conferma cancellazione
    </button>
    <button
     type="button"
     onClick={doReject}
     disabled={pending}
     className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:border-red-500 hover:text-red-600 disabled:opacity-50"
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
