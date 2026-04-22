import { getAppointmentRequests } from "@/lib/actions/appointment-requests";
import { AppointmentRequestCard } from "@/components/whatsapp/appointment-request-card";
import { AutoRefresh } from "@/components/whatsapp/auto-refresh";

export default async function RichiestePage() {
 const requests = await getAppointmentRequests("pending_review");

 return (
  <div>
   <AutoRefresh intervalMs={10000} />
   <div className="mb-4 flex items-center justify-between">
    <span className="text-xs text-muted-foreground">
     {requests.length}{" "}
     {requests.length === 1 ? "richiesta in attesa" : "richieste in attesa"}
    </span>
   </div>

   {requests.length === 0 ? (
    <div className="rounded-lg border border-border bg-card p-8 text-center">
     <p className="text-sm text-muted-foreground">
      Nessuna richiesta di prenotazione da processare. Marialucia raccoglie le
      richieste dal bot e le fa apparire qui per il triage.
     </p>
    </div>
   ) : (
    <div className="space-y-3">
     {requests.map((r) => (
      <AppointmentRequestCard key={r.id} req={r} />
     ))}
    </div>
   )}
  </div>
 );
}
