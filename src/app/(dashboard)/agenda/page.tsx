"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Euro, Users, Calendar } from "lucide-react";
import { getAppointments, getAppointmentsByRange, updateAppointmentStatus } from "@/lib/actions/appointments";
import { getStaff, Staff } from "@/lib/actions/staff";

const HOUR_HEIGHT = 64; // px per hour
const START_HOUR = 8;
const END_HOUR = 20;

type Appointment = {
  id: string;
  data: string;
  ora_inizio: string;
  ora_fine: string | null;
  stato: string;
  note: string | null;
  staff_id: string | null;
  clients: { nome: string; cognome: string; telefono: string | null } | null;
  services: { nome: string; durata: number; prezzo: number; categoria: string } | null;
  staff: { id: string; nome: string; colore: string } | null;
};

type WeekDayInfo = {
  date: string; // YYYY-MM-DD
  label: string; // "Lun"
  dayNum: number;
  count: number;
};

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getWeekDays(selectedDate: string): { monday: string; sunday: string; days: { date: string; label: string; dayNum: number }[] } {
  const d = new Date(selectedDate + "T00:00:00");
  const dow = d.getDay(); // 0=Sun, 1=Mon...
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const shortDays = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push({
      date: toDateStr(day),
      label: shortDays[day.getDay()],
      dayNum: day.getDate(),
    });
  }
  return { monday: toDateStr(monday), sunday: toDateStr(days[6] ? new Date(monday.getTime() + 6 * 86400000) : monday), days };
}

function formatNavDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d).replace(/\b\w/g, (l) => l.toUpperCase());
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function getStatusClasses(stato: string) {
  switch (stato) {
    case "confermato":
      return {
        card: "bg-blue-50 border-l-blue-500 text-blue-900",
        border: "border-l-4",
        time: "text-blue-600",
        name: "text-blue-900 font-bold",
        service: "text-blue-700",
      };
    case "completato":
      return {
        card: "bg-green-50 border-l-green-500 text-green-900",
        border: "border-l-4",
        time: "text-green-600",
        name: "text-green-900 font-bold",
        service: "text-green-700",
      };
    case "cancellato":
      return {
        card: "bg-gray-100 border-l-gray-400 text-gray-500",
        border: "border-l-4",
        time: "text-gray-400 line-through",
        name: "text-gray-500 font-bold line-through",
        service: "text-gray-400 line-through",
      };
    case "no_show":
      return {
        card: "bg-orange-50 border-l-orange-400 text-orange-900",
        border: "border-l-4",
        time: "text-orange-500",
        name: "text-orange-900 font-bold",
        service: "text-orange-700",
      };
    default:
      return {
        card: "bg-gray-50 border-l-gray-300 text-gray-700",
        border: "border-l-4",
        time: "text-gray-500",
        name: "text-gray-700 font-bold",
        service: "text-gray-500",
      };
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

function AppointmentCard({
  apt,
  topPx,
  heightPx,
  onStatusChange,
  showStaffDot = false,
}: {
  apt: Appointment;
  topPx: number;
  heightPx: number;
  onStatusChange: (id: string, stato: string) => void;
  showStaffDot?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const classes = getStatusClasses(apt.stato);
  const startTime = apt.ora_inizio.slice(0, 5);
  const endTime = apt.ora_fine ? apt.ora_fine.slice(0, 5) : null;
  const clientName = apt.clients ? `${apt.clients.nome} ${apt.clients.cognome}` : "Cliente";
  const serviceName = apt.services?.nome ?? "";
  const showCheckout = apt.stato === "confermato" || apt.stato === "completato";

  return (
    <div
      className={`absolute left-1 right-1 rounded-lg border ${classes.border} ${classes.card} shadow-sm cursor-pointer transition-shadow hover:shadow-md overflow-hidden`}
      style={{ top: topPx, height: heightPx, zIndex: hovered ? 20 : 10 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="px-2 py-1 h-full flex flex-col justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            {showStaffDot && apt.staff && (
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: apt.staff.colore }}
              />
            )}
            <p className={`text-[10px] leading-tight ${classes.time}`}>
              {startTime}{endTime ? ` – ${endTime}` : ""}
            </p>
          </div>
          <p className={`text-xs leading-tight truncate ${classes.name}`}>{clientName}</p>
          {heightPx > 44 && (
            <p className={`text-[10px] leading-tight truncate ${classes.service}`}>{serviceName}</p>
          )}
        </div>
        {heightPx > 56 && (
          <p className="text-[9px] text-gray-400 capitalize">{getStatoLabel(apt.stato)}</p>
        )}
      </div>

      {/* Hover overlay with action buttons */}
      {hovered && apt.stato !== "cancellato" && (
        <div className="absolute inset-0 bg-white/90 rounded-lg flex flex-col items-center justify-center gap-1 p-1">
          <p className={`text-[10px] font-semibold truncate max-w-full px-1 ${classes.name}`}>{clientName}</p>
          <div className="flex gap-1 flex-wrap justify-center">
            {apt.stato !== "completato" && (
              <button
                onClick={(e) => { e.stopPropagation(); onStatusChange(apt.id, "completato"); }}
                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-green-500 text-white hover:bg-green-600"
              >
                <CheckCircle2 className="h-3 w-3" />
                Completa
              </button>
            )}
            {showCheckout && (
              <Link
                href={`/agenda/checkout/${apt.id}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-gold text-white hover:opacity-90"
              >
                <Euro className="h-3 w-3" />
                Checkout
              </Link>
            )}
            {apt.stato !== "cancellato" && (
              <button
                onClick={(e) => { e.stopPropagation(); onStatusChange(apt.id, "cancellato"); }}
                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-500 text-white hover:bg-red-600"
              >
                <XCircle className="h-3 w-3" />
                Cancella
              </button>
            )}
            {apt.stato !== "no_show" && (
              <button
                onClick={(e) => { e.stopPropagation(); onStatusChange(apt.id, "no_show"); }}
                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-orange-400 text-white hover:bg-orange-500"
              >
                No Show
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AgendaContent() {
  const today = toDateStr(new Date());
  const searchParams = useSearchParams();
  const paramData = searchParams.get("data");
  const initialDate = paramData && /^\d{4}-\d{2}-\d{2}$/.test(paramData) ? paramData : today;
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [weekCounts, setWeekCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"singola" | "operatrici">("singola");
  const [staffList, setStaffList] = useState<Staff[]>([]);

  // Load staff list
  useEffect(() => {
    getStaff(true)
      .then((list) => setStaffList(list))
      .catch((err) => console.error("Error loading staff:", err));
  }, []);

  // Fetch appointments for selected date
  const fetchAppointments = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const rows = await getAppointments(date);
      setAppointments(rows as unknown as Appointment[]);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch week counts
  const fetchWeekCounts = useCallback(async (date: string) => {
    const { monday, sunday } = getWeekDays(date);
    try {
      const rows = await getAppointmentsByRange(monday, sunday);
      const counts: Record<string, number> = {};
      for (const row of rows as { data: string; stato: string }[]) {
        if (row.stato !== "cancellato") {
          const key = String(row.data).slice(0, 10);
          counts[key] = (counts[key] || 0) + 1;
        }
      }
      setWeekCounts(counts);
    } catch (err) {
      console.error("Error fetching week counts:", err);
    }
  }, []);

  useEffect(() => {
    fetchAppointments(selectedDate);
  }, [selectedDate, fetchAppointments]);

  useEffect(() => {
    fetchWeekCounts(selectedDate);
  }, [selectedDate, fetchWeekCounts]);

  async function handleStatusChange(id: string, stato: string) {
    try {
      await updateAppointmentStatus(id, stato);
      fetchAppointments(selectedDate);
      fetchWeekCounts(selectedDate);
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Errore aggiornamento stato");
    }
  }

  // Stats
  const totalAppointments = appointments.filter((a) => a.stato !== "cancellato").length;
  const estimatedRevenue = appointments
    .filter((a) => a.stato !== "cancellato")
    .reduce((sum, a) => sum + Number(a.services?.prezzo || 0), 0);

  // Time grid
  const hours: number[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    hours.push(h);
  }
  const gridHeightPx = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  // Weekly strip
  const { days: weekDays } = getWeekDays(selectedDate);

  // Build appointment cards positions
  const aptCards = appointments.map((apt) => {
    const startParts = apt.ora_inizio.slice(0, 5).split(":").map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const duration = apt.services?.durata || 60;
    const topPx = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const heightPx = Math.max((duration / 60) * HOUR_HEIGHT, 40);
    return { apt, topPx, heightPx };
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-brown">
            Agenda
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-border bg-card overflow-hidden">
            <button
              onClick={() => setViewMode("singola")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                viewMode === "singola"
                  ? "bg-rose text-white"
                  : "text-muted-foreground hover:bg-cream-dark hover:text-brown"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Vista Singola
            </button>
            <button
              onClick={() => setViewMode("operatrici")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                viewMode === "operatrici"
                  ? "bg-rose text-white"
                  : "text-muted-foreground hover:bg-cream-dark hover:text-brown"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Vista Operatrici
            </button>
          </div>
          <Link
            href={`/agenda/nuovo?data=${selectedDate}`}
            className="inline-flex items-center gap-2 rounded-lg bg-rose px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-dark"
          >
            <Plus className="h-4 w-4" />
            Nuovo Appuntamento
          </Link>
        </div>
      </div>

      {/* Date navigation bar */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-brown hover:bg-cream-dark"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-[140px] rounded-lg border border-border bg-card px-4 py-2 text-center text-sm font-semibold text-brown">
          {formatNavDate(selectedDate)}
        </div>
        <button
          onClick={() => setSelectedDate(today)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            selectedDate === today
              ? "border-rose bg-rose text-white"
              : "border-border bg-card text-brown hover:bg-cream-dark"
          }`}
        >
          Oggi
        </button>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-brown hover:bg-cream-dark"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekly mini strip */}
      <div className="mb-4 flex gap-1 rounded-xl border border-border bg-card p-3 shadow-sm overflow-x-auto">
        {weekDays.map((day) => {
          const isSelected = day.date === selectedDate;
          const isToday = day.date === today;
          const count = weekCounts[day.date] || 0;
          return (
            <button
              key={day.date}
              onClick={() => setSelectedDate(day.date)}
              className={`flex min-w-[48px] flex-1 flex-col items-center rounded-lg px-2 py-1.5 text-xs transition-colors ${
                isSelected
                  ? "bg-rose text-white"
                  : isToday
                  ? "bg-rose/10 text-rose"
                  : "text-muted-foreground hover:bg-cream-dark hover:text-brown"
              }`}
            >
              <span className="font-medium">{day.label}</span>
              <span className={`text-sm font-bold ${isSelected ? "text-white" : "text-brown"}`}>
                {day.dayNum}
              </span>
              {count > 0 ? (
                <span
                  className={`mt-0.5 rounded-full px-1.5 text-[10px] font-semibold ${
                    isSelected ? "bg-white/20 text-white" : "bg-rose/10 text-rose"
                  }`}
                >
                  {count}
                </span>
              ) : (
                <span className="mt-0.5 h-4" />
              )}
            </button>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
        {loading ? (
          <span>Caricamento...</span>
        ) : (
          <>
            <span>
              <strong className="text-brown">{totalAppointments}</strong>{" "}
              appuntament{totalAppointments === 1 ? "o" : "i"} oggi
            </span>
            {estimatedRevenue > 0 && (
              <>
                <span className="text-border">|</span>
                <span>
                  <strong className="text-brown">€{estimatedRevenue.toFixed(0)}</strong> stimati
                </span>
              </>
            )}
          </>
        )}
      </div>

      {/* Vista Singola */}
      {viewMode === "singola" && (
        <div
          className="rounded-xl border border-border bg-card shadow-sm overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          <div className="flex">
            {/* Hour labels */}
            <div className="shrink-0 w-14 border-r border-border bg-cream/30">
              {hours.map((h) => (
                <div
                  key={h}
                  className="flex items-start justify-end pr-2 text-[11px] text-muted-foreground"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <span className="-mt-2">{h < 10 ? `0${h}:00` : `${h}:00`}</span>
                </div>
              ))}
            </div>

            {/* Appointment area */}
            <div className="flex-1 relative" style={{ height: gridHeightPx }}>
              {/* Hour lines */}
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-border/40"
                  style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                />
              ))}
              {/* Half-hour lines */}
              {hours.slice(0, -1).map((h) => (
                <div
                  key={`h-${h}`}
                  className="absolute left-0 right-0 border-t border-border/20 border-dashed"
                  style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                />
              ))}

              {/* Clickable empty slots */}
              {hours.slice(0, -1).map((h) => (
                <Link
                  key={`slot-${h}`}
                  href={`/agenda/nuovo?data=${selectedDate}&ora=${h < 10 ? `0${h}` : h}:00`}
                  className="absolute left-0 right-0 hover:bg-rose/5 transition-colors"
                  style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT, zIndex: 1 }}
                />
              ))}

              {/* Appointment cards */}
              {aptCards.map(({ apt, topPx, heightPx }) => (
                <AppointmentCard
                  key={apt.id}
                  apt={apt}
                  topPx={topPx}
                  heightPx={heightPx}
                  onStatusChange={handleStatusChange}
                  showStaffDot={true}
                />
              ))}

              {/* Empty state */}
              {!loading && appointments.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Nessun appuntamento</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Clicca su una fascia oraria per aggiungere</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vista Multi-Operatrice */}
      {viewMode === "operatrici" && (
        <div
          className="rounded-xl border border-border bg-card shadow-sm overflow-auto"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          <div className="flex">
            {/* Colonna ore - fissa */}
            <div className="shrink-0 w-14 border-r border-border bg-cream/30 sticky left-0 z-20">
              {/* Spazio per header operatrici */}
              <div style={{ height: 40 }} className="border-b border-border" />
              {hours.map((h) => (
                <div
                  key={h}
                  className="flex items-start justify-end pr-2 text-[11px] text-muted-foreground"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <span className="-mt-2">{h < 10 ? `0${h}:00` : `${h}:00`}</span>
                </div>
              ))}
            </div>

            {/* Colonne operatrici */}
            {staffList.map((staff) => (
              <div
                key={staff.id}
                className="flex-1 min-w-[140px] border-l border-border relative"
                style={{ height: gridHeightPx + 40 }}
              >
                {/* Header operatrice */}
                <div
                  className="sticky top-0 z-30 flex items-center justify-center gap-1.5 py-2 border-b border-border"
                  style={{ backgroundColor: staff.colore + "40", height: 40 }}
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: staff.colore }}
                  />
                  <span className="text-xs font-semibold text-brown truncate">{staff.nome}</span>
                </div>

                {/* Grid area */}
                <div className="relative" style={{ height: gridHeightPx }}>
                  {/* Hour lines */}
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-border/30"
                      style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Slot vuoti cliccabili */}
                  {hours.slice(0, -1).map((h) => (
                    <Link
                      key={`slot-${h}`}
                      href={`/agenda/nuovo?data=${selectedDate}&ora=${h < 10 ? `0${h}` : h}:00&staffId=${staff.id}`}
                      className="absolute left-0 right-0 hover:bg-rose/5 transition-colors"
                      style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT, zIndex: 1 }}
                    />
                  ))}

                  {/* Appointment cards per questa operatrice */}
                  {aptCards
                    .filter(({ apt }) => apt.staff_id === staff.id)
                    .map(({ apt, topPx, heightPx }) => (
                      <AppointmentCard
                        key={apt.id}
                        apt={apt}
                        topPx={topPx}
                        heightPx={heightPx}
                        onStatusChange={handleStatusChange}
                        showStaffDot={false}
                      />
                    ))}
                </div>
              </div>
            ))}

            {/* Colonna appuntamenti senza operatrice */}
            {aptCards.some(({ apt }) => !apt.staff_id) && (
              <div
                className="flex-1 min-w-[140px] border-l border-border relative"
                style={{ height: gridHeightPx + 40 }}
              >
                <div
                  className="sticky top-0 z-30 flex items-center justify-center gap-1.5 py-2 border-b border-border bg-card"
                  style={{ height: 40 }}
                >
                  <span className="text-xs font-semibold text-muted-foreground">Non assegnato</span>
                </div>
                <div className="relative" style={{ height: gridHeightPx }}>
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-border/30"
                      style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                    />
                  ))}
                  {aptCards
                    .filter(({ apt }) => !apt.staff_id)
                    .map(({ apt, topPx, heightPx }) => (
                      <AppointmentCard
                        key={apt.id}
                        apt={apt}
                        topPx={topPx}
                        heightPx={heightPx}
                        onStatusChange={handleStatusChange}
                        showStaffDot={false}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Empty state quando non ci sono operatrici */}
            {staffList.length === 0 && !loading && (
              <div className="flex-1 flex items-center justify-center py-20 text-sm text-muted-foreground">
                Nessuna operatrice trovata. Aggiungi il personale in Impostazioni.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Caricamento agenda...</div>}>
      <AgendaContent />
    </Suspense>
  );
}
