import Link from "next/link";
import { CalendarPlus, CalendarClock, CalendarX } from "lucide-react";
import {
 getAppointmentRequests,
 getPendingAppointmentRequestsCountByTipo,
 type AppointmentRequestTipo,
} from "@/lib/actions/appointment-requests";
import { AppointmentRequestCard } from "@/components/whatsapp/appointment-request-card";
import { RescheduleRequestCard } from "@/components/whatsapp/reschedule-request-card";
import { CancellationRequestCard } from "@/components/whatsapp/cancellation-request-card";
import { AutoRefresh } from "@/components/whatsapp/auto-refresh";

const VALID_TIPI: AppointmentRequestTipo[] = ["nuovo", "spostamento", "cancellazione"];

function isValidTipo(t: string): t is AppointmentRequestTipo {
 return (VALID_TIPI as string[]).includes(t);
}

type SearchParams = Promise<{ tipo?: string }>;

export default async function RichiestePage({
 searchParams,
}: {
 searchParams: SearchParams;
}) {
 const sp = await searchParams;
 const rawTipo = (sp?.tipo ?? "nuovo").toString();
 const activeTipo: AppointmentRequestTipo = isValidTipo(rawTipo) ? rawTipo : "nuovo";

 const [requests, counts] = await Promise.all([
  getAppointmentRequests({ stato: "pending_review", tipo: activeTipo }),
  getPendingAppointmentRequestsCountByTipo(),
 ]);

 const tabs: Array<{
  tipo: AppointmentRequestTipo;
  label: string;
  badge: number;
  Icon: typeof CalendarPlus;
 }> = [
  { tipo: "nuovo", label: "Nuove prenotazioni", badge: counts.nuovo, Icon: CalendarPlus },
  { tipo: "spostamento", label: "Spostamenti", badge: counts.spostamento, Icon: CalendarClock },
  { tipo: "cancellazione", label: "Cancellazioni", badge: counts.cancellazione, Icon: CalendarX },
 ];

 return (
  <div>
   <AutoRefresh intervalMs={10000} />

   {/* Sub-tabs per tipo */}
   <nav className="mb-4 flex flex-wrap gap-2">
    {tabs.map((t) => {
     const isActive = t.tipo === activeTipo;
     return (
      <Link
       key={t.tipo}
       href={`/whatsapp/richieste?tipo=${t.tipo}`}
       className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        isActive
         ? "border-rose bg-rose/10 text-rose"
         : "border-border text-muted-foreground hover:border-rose hover:text-rose"
       }`}
      >
       <t.Icon className="h-4 w-4" />
       {t.label}
       {t.badge > 0 && (
        <span
         className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
          isActive
           ? "bg-rose text-white"
           : "bg-muted text-muted-foreground"
         }`}
        >
         {t.badge}
        </span>
       )}
      </Link>
     );
    })}
   </nav>

   <div className="mb-4 flex items-center justify-between">
    <span className="text-xs text-muted-foreground">
     {requests.length}{" "}
     {requests.length === 1 ? "richiesta in attesa" : "richieste in attesa"}
    </span>
   </div>

   {requests.length === 0 ? (
    <div className="rounded-lg border border-border bg-card p-8 text-center">
     <p className="text-sm text-muted-foreground">
      {activeTipo === "nuovo"
       ? "Nessuna richiesta di prenotazione da processare."
       : activeTipo === "spostamento"
        ? "Nessuna richiesta di spostamento da processare."
        : "Nessuna richiesta di cancellazione da processare."}
     </p>
    </div>
   ) : (
    <div className="space-y-3">
     {requests.map((r) => {
      if (r.tipo === "spostamento") {
       return <RescheduleRequestCard key={r.id} req={r} />;
      }
      if (r.tipo === "cancellazione") {
       return <CancellationRequestCard key={r.id} req={r} />;
      }
      return <AppointmentRequestCard key={r.id} req={r} />;
     })}
    </div>
   )}
  </div>
 );
}
