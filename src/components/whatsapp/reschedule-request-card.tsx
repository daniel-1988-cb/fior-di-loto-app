"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X, ExternalLink, ChevronRight, CalendarClock } from "lucide-react";
import {
 confirmRescheduleRequest,
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

function fmtIsoLabel(iso: string): string {
 const d = new Date(iso);
 if (isNaN(d.getTime())) return iso;
 const date = d.toISOString().slice(0, 10);
 const HH = String(d.getUTCHours()).padStart(2, "0");
 const MM = String(d.getUTCMinutes()).padStart(2, "0");
 return `${fmtDateIt(date)} ${HH}:${MM}`;
}

export function RescheduleRequestCard({ req }: Props) {
 const router = useRouter();
 const [pending, startTransition] = useTransition();
 const [chosenIso, setChosenIso] = useState<string | null>(req.proposedDateTime);
 const [showNote, setShowNote] = useState(false);
 const [note, setNote] = useState(req.noteOperatore ?? "");

 function doConfirm() {
  if (!chosenIso) {
   alert(
    "Nessun orario selezionato. Scegli un orario tra quelli proposti, oppure rifiuta e contatta a mano.",
   );
   return;
  }
  if (!confirm(`Confermi lo spostamento al ${fmtIsoLabel(chosenIso)}?`)) return;
  startTransition(async () => {
   const res = await confirmRescheduleRequest(req.id, chosenIso);
   if (res.ok) router.refresh();
   else alert("Errore: " + res.error);
  });
 }

 function doReject() {
  if (!confirm("Rifiutare la richiesta di spostamento?")) return;
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
 const agendaHref = ref ? `/agenda?data=${ref.data}` : "/agenda";

 return (
  <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4">
   <div className="mb-2 flex items-center gap-2 text-xs font-medium text-amber-700">
    <CalendarClock className="h-4 w-4" />
    Spostamento richiesto
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

   {/* Appuntamento corrente */}
   {ref ? (
    <div className="mt-3 rounded-md border border-border bg-card p-3 text-xs">
     <div className="font-medium text-muted-foreground">Appuntamento attuale</div>
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

   {/* Orario proposto dal cliente */}
   {req.proposedDateTime && (
    <div className="mt-2 rounded-md border border-border bg-card p-3 text-xs">
     <div className="font-medium text-muted-foreground">
      Orario proposto dal cliente
     </div>
     <label className="mt-1 flex items-center gap-2 text-brown">
      <input
       type="radio"
       name={`choose-${req.id}`}
       checked={chosenIso === req.proposedDateTime}
       onChange={() => setChosenIso(req.proposedDateTime)}
       className="accent-rose"
      />
      {fmtIsoLabel(req.proposedDateTime)}
     </label>
    </div>
   )}

   {/* Alternative suggerite dal bot */}
   {req.proposedAlternatives.length > 0 && (
    <div className="mt-2 rounded-md border border-border bg-card p-3 text-xs">
     <div className="font-medium text-muted-foreground">
      Alternative suggerite al cliente
     </div>
     <div className="mt-1 space-y-1">
      {req.proposedAlternatives.map((iso) => (
       <label key={iso} className="flex items-center gap-2 text-brown">
        <input
         type="radio"
         name={`choose-${req.id}`}
         checked={chosenIso === iso}
         onChange={() => setChosenIso(iso)}
         className="accent-rose"
        />
        {fmtIsoLabel(iso)}
       </label>
      ))}
     </div>
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
     disabled={pending || !chosenIso || !ref}
     className="inline-flex items-center gap-1 rounded-lg bg-rose px-3 py-1.5 text-xs font-medium text-white hover:bg-rose/90 disabled:opacity-50"
    >
     <Check className="h-3 w-3" />
     Conferma spostamento
    </button>
    <Link
     href={agendaHref}
     className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:border-rose hover:text-rose"
    >
     <ExternalLink className="h-3 w-3" />
     Apri agenda
    </Link>
    <button
     type="button"
     onClick={doReject}
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
