import Link from "next/link";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

type Appointment = {
  id: string;
  data: string;
  ora_inizio: string;
  stato: string;
  services: { nome?: string; prezzo?: number } | null;
  staff: { nome?: string; cognome?: string; colore?: string } | null;
};

const STATO_CONFIG: Record<
  string,
  { icon: React.ReactElement; label: string; color: string }
> = {
  completato: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: "Completato",
    color: "text-success bg-success/10",
  },
  confermato: {
    icon: <Clock className="h-3.5 w-3.5" />,
    label: "Confermato",
    color: "text-info bg-info/10",
  },
  no_show: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: "No-show",
    color: "text-destructive bg-destructive/10",
  },
  cancellato: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    label: "Cancellato",
    color: "text-muted-foreground bg-muted",
  },
};

export function AppuntamentiTab({
  appointments,
}: {
  appointments: Array<Record<string, unknown>>;
}) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Nessun appuntamento.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-3">
        <h3 className="font-semibold text-brown">
          Appuntamenti ({appointments.length})
        </h3>
      </div>
      <ul className="divide-y divide-border">
        {appointments.map((raw) => {
          const apt = raw as unknown as Appointment;
          const stato = apt.stato || "confermato";
          const s = STATO_CONFIG[stato] || STATO_CONFIG.confermato;
          const dataStr = String(apt.data || "").slice(0, 10);
          const oraStr = String(apt.ora_inizio || "").slice(0, 5);
          const dataFormatted = dataStr
            ? new Date(dataStr + "T00:00:00").toLocaleDateString("it-IT", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "—";
          const service = apt.services;
          const staff = apt.staff;

          const href = dataStr ? `/agenda?date=${dataStr}` : "/agenda";

          return (
            <li key={apt.id}>
              <Link
                href={href}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${s.color}`}
                    >
                      {s.icon}
                      {s.label}
                    </span>
                    <span className="truncate text-sm font-medium text-brown">
                      {service?.nome || "—"}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {dataFormatted}
                      {oraStr && ` • ${oraStr}`}
                    </span>
                    {staff && staff.nome && (
                      <span className="flex items-center gap-1">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: staff.colore || "#e8a4a4" }}
                        />
                        {staff.nome}
                      </span>
                    )}
                  </div>
                </div>
                {service?.prezzo != null && Number(service.prezzo) > 0 && (
                  <span className="shrink-0 text-sm font-semibold text-brown">
                    €{Number(service.prezzo).toFixed(0)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
