"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
 Drawer,
 Button,
 Badge,
 Avatar,
} from "@/components/ui";
import {
 Calendar as CalIcon,
 Clock,
 User,
 Phone,
 Pencil,
 Trash2,
 CheckCircle2,
 XCircle,
 StickyNote,
} from "lucide-react";
import {
 updateAppointmentStatus,
 deleteAppointment,
} from "@/lib/actions/appointments";
import { formatPhone, formatCurrency } from "@/lib/utils";

export type AppointmentDrawerData = {
 id: string;
 clientId?: string | null;
 clientName: string;
 clientPhone: string | null;
 serviceName: string;
 servicePrice: number | null;
 serviceDurata: number | null;
 staffId: string | null;
 staffName: string | null;
 staffColore?: string | null;
 date: string; // "YYYY-MM-DD"
 oraInizio: string; // "HH:MM"
 oraFine: string; // "HH:MM"
 stato: string;
 pagatoAt?: string | null;
 note: string | null;
};

type Props = {
 appt: AppointmentDrawerData | null;
 onClose: () => void;
 /**
  * Se presente, il bottone "Checkout" aprirà un popup/modal nel parent
  * invece di navigare a /agenda/checkout/:id/carrello. Il drawer chiude
  * automaticamente dopo aver invocato la callback.
  */
 onOpenCheckout?: (appointmentId: string) => void;
};

const STATO_LABEL: Record<string, { label: string; variant: "default" | "success" | "primary" | "danger" }> = {
 confermato: { label: "Prenotato", variant: "primary" },
 completato: { label: "Completato", variant: "success" },
 cancellato: { label: "Cancellato", variant: "danger" },
 no_show: { label: "No-show", variant: "danger" },
};

export function AppointmentDetailDrawer({ appt, onClose, onOpenCheckout }: Props) {
 const router = useRouter();
 const [pending, startTransition] = useTransition();

 if (!appt) return null;

 const statoInfo = STATO_LABEL[appt.stato] ?? { label: appt.stato, variant: "default" as const };

 function handleMarkStato(stato: "completato" | "cancellato" | "no_show") {
  startTransition(async () => {
   try {
    await updateAppointmentStatus(appt!.id, stato);
    router.refresh();
    onClose();
   } catch (e) {
    alert(`Errore: ${e instanceof Error ? e.message : "sconosciuto"}`);
   }
  });
 }

 function handleDelete() {
  if (!confirm("Eliminare definitivamente questo appuntamento?")) return;
  startTransition(async () => {
   try {
    await deleteAppointment(appt!.id);
    router.refresh();
    onClose();
   } catch (e) {
    alert(`Errore: ${e instanceof Error ? e.message : "sconosciuto"}`);
   }
  });
 }

 const dateLabel = new Date(appt.date).toLocaleDateString("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
 });
 const durataLabel = appt.serviceDurata
  ? `${appt.serviceDurata >= 60 ? `${Math.floor(appt.serviceDurata / 60)}h ` : ""}${
     appt.serviceDurata % 60 > 0 ? `${appt.serviceDurata % 60}min` : ""
    }`.trim()
  : "";

 return (
  <Drawer open={!!appt} onClose={onClose} title="Dettagli appuntamento" width="md">
   <div className="space-y-6">
    {/* Header blocco orario */}
    <div className="rounded-xl border border-border bg-card p-4">
     <div className="flex items-start justify-between gap-2">
      <div>
       <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalIcon className="h-4 w-4" />
        {dateLabel}
       </div>
       <div className="mt-1 flex items-center gap-2 text-xl font-bold text-foreground">
        <Clock className="h-5 w-5 text-muted-foreground" />
        {appt.oraInizio} — {appt.oraFine}
       </div>
      </div>
      <div className="flex flex-col items-end gap-1">
       <Badge variant={statoInfo.variant}>{statoInfo.label}</Badge>
       {appt.pagatoAt && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
         <CheckCircle2 className="h-3 w-3" />
         Pagato
        </span>
       )}
      </div>
     </div>
    </div>

    {/* Cliente */}
    <div>
     <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Cliente
     </h3>
     <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <Avatar name={appt.clientName} size="md" color="#C97A7A" />
      <div className="min-w-0 flex-1">
       {appt.clientId ? (
        <Link
         href={`/clienti/${appt.clientId}`}
         className="font-medium text-foreground hover:text-rose"
         onClick={onClose}
        >
         {appt.clientName}
        </Link>
       ) : (
        <span className="font-medium text-foreground">{appt.clientName}</span>
       )}
       {appt.clientPhone && (
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
         <Phone className="h-3 w-3" />
         <a href={`tel:+39${appt.clientPhone}`} className="hover:text-rose">
          {formatPhone(appt.clientPhone)}
         </a>
        </p>
       )}
      </div>
     </div>
    </div>

    {/* Servizio */}
    <div>
     <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Servizio
     </h3>
     <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
       <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{appt.serviceName}</p>
        <p className="text-xs text-muted-foreground">
         {durataLabel}
         {appt.staffName && <> · {appt.staffName}</>}
        </p>
       </div>
       {appt.servicePrice != null && (
        <p className="shrink-0 text-right font-semibold text-foreground">
         {formatCurrency(appt.servicePrice)}
        </p>
       )}
      </div>
     </div>
    </div>

    {/* Staff avatar */}
    {appt.staffName && (
     <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
       Operatrice
      </h3>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
       <Avatar name={appt.staffName} size="sm" color={appt.staffColore ?? "#6B4EFF"} />
       <span className="text-sm text-foreground">{appt.staffName}</span>
      </div>
     </div>
    )}

    {/* Note */}
    {appt.note && (
     <div>
      <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
       <StickyNote className="h-3 w-3" />
       Note
      </h3>
      <div className="rounded-lg border border-border bg-card p-3 text-sm text-foreground">
       <p className="whitespace-pre-wrap">{appt.note}</p>
      </div>
     </div>
    )}

    {/* Azioni */}
    <div className="space-y-2 pt-2">
     <div className="grid grid-cols-2 gap-2">
      <Button
       variant="outline"
       disabled={!!appt.pagatoAt}
       onClick={() => {
        if (appt.pagatoAt) return;
        if (onOpenCheckout) {
         // Nuovo flow: popup/modal sopra l'agenda, niente navigazione.
         onOpenCheckout(appt.id);
         onClose();
         return;
        }
        // Fallback (es. pagina /clienti): comportamento storico full-page.
        router.push(`/agenda/checkout/${appt.id}/carrello`);
        onClose();
       }}
      >
       <Pencil className="h-4 w-4" />
       {appt.pagatoAt ? "Già pagato" : "Checkout"}
      </Button>
      {appt.clientId && (
       <Link
        href={`/clienti/${appt.clientId}`}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        onClick={onClose}
       >
        <User className="h-4 w-4" />
        Scheda cliente
       </Link>
      )}
     </div>

     {appt.stato !== "completato" && appt.stato !== "cancellato" && (
      <div className="grid grid-cols-3 gap-2">
       <Button
        variant="outline"
        disabled={pending}
        onClick={() => handleMarkStato("completato")}
        className="text-emerald-600 hover:text-emerald-700"
       >
        <CheckCircle2 className="h-4 w-4" />
        Completato
       </Button>
       <Button
        variant="outline"
        disabled={pending}
        onClick={() => handleMarkStato("no_show")}
       >
        No-show
       </Button>
       <Button
        variant="outline"
        disabled={pending}
        onClick={() => handleMarkStato("cancellato")}
        className="text-red-600 hover:text-red-700"
       >
        <XCircle className="h-4 w-4" />
        Annulla
       </Button>
      </div>
     )}

     <Button
      variant="outline"
      disabled={pending}
      onClick={handleDelete}
      className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
     >
      <Trash2 className="h-4 w-4" />
      Elimina appuntamento
     </Button>
    </div>
   </div>
  </Drawer>
 );
}
