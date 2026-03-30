export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus, Clock, User, CheckCircle2, XCircle, AlertCircle, Calendar } from "lucide-react";
import { getUpcomingAppointments } from "@/lib/actions/appointments";

type Appointment = {
  id: string;
  data: string;
  ora_inizio: string;
  ora_fine: string | null;
  stato: string;
  note: string | null;
  client_nome: string | null;
  client_cognome: string | null;
  service_nome: string | null;
  service_durata: number | null;
  service_prezzo: number | null;
};

function getStatoBadge(stato: string) {
  switch (stato) {
    case "confermato":
      return "bg-blue-100 text-blue-700";
    case "completato":
      return "bg-success/20 text-success";
    case "cancellato":
      return "bg-red-100 text-red-600";
    case "no_show":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getStatoLabel(stato: string) {
  switch (stato) {
    case "confermato": return "Confermato";
    case "completato": return "Completato";
    case "cancellato": return "Cancellato";
    case "no_show": return "No Show";
    default: return stato;
  }
}

function getStatoIcon(stato: string) {
  switch (stato) {
    case "confermato": return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "completato": return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "cancellato": return <XCircle className="h-3.5 w-3.5" />;
    case "no_show": return <AlertCircle className="h-3.5 w-3.5" />;
    default: return null;
  }
}

function formatDay(dateStr: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(dateStr + "T00:00:00"));
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().slice(0, 10);
}

export default async function AgendaPage() {
  const appointments = await getUpcomingAppointments() as unknown as Appointment[];

  // Group by date
  const grouped: Record<string, Appointment[]> = {};
  for (const apt of appointments) {
    const key = String(apt.data).slice(0, 10);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(apt);
  }

  const days = Object.keys(grouped).sort();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
            Agenda
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prossimi 7 giorni — {appointments.length} appuntamenti
          </p>
        </div>
        <Link
          href="/agenda/nuovo"
          className="inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-dark"
        >
          <Plus className="h-4 w-4" />
          Nuovo Appuntamento
        </Link>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nessun appuntamento nei prossimi 7 giorni</p>
          <Link
            href="/agenda/nuovo"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:bg-rose-dark"
          >
            <Plus className="h-4 w-4" />
            Aggiungi Appuntamento
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <div key={day}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-semibold capitalize text-brown">
                  {formatDay(day)}
                </h2>
                {isToday(day) && (
                  <span className="rounded-full bg-rose/10 px-2.5 py-0.5 text-xs font-medium text-rose">
                    Oggi
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {grouped[day].length} appuntament{grouped[day].length === 1 ? "o" : "i"}
                </span>
              </div>
              <div className="space-y-3">
                {grouped[day].map((apt) => (
                  <div
                    key={apt.id}
                    className="rounded-xl border border-border bg-card p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        {/* Time */}
                        <div className="flex min-w-[60px] flex-col items-center rounded-lg bg-cream-dark px-2 py-1.5 text-center">
                          <Clock className="mb-0.5 h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-bold text-brown">
                            {String(apt.ora_inizio).slice(0, 5)}
                          </span>
                          {apt.ora_fine && (
                            <span className="text-xs text-muted-foreground">
                              {String(apt.ora_fine).slice(0, 5)}
                            </span>
                          )}
                        </div>
                        {/* Details */}
                        <div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-brown">
                              {apt.client_nome} {apt.client_cognome}
                            </span>
                          </div>
                          {apt.service_nome && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {apt.service_nome}
                              {apt.service_durata && (
                                <span className="ml-1">— {apt.service_durata} min</span>
                              )}
                            </p>
                          )}
                          {apt.note && (
                            <p className="mt-1 text-xs text-muted-foreground italic">{apt.note}</p>
                          )}
                        </div>
                      </div>
                      {/* Status badge */}
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatoBadge(apt.stato)}`}
                      >
                        {getStatoIcon(apt.stato)}
                        {getStatoLabel(apt.stato)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
