"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Euro, RefreshCw, Settings2, CalendarDays, ChevronDown } from "lucide-react";
import { getAppointments, getAppointmentsByRange, updateAppointmentStatus } from "@/lib/actions/appointments";
import { getStaff, getStaffFerie, Staff } from "@/lib/actions/staff";

const HOUR_HEIGHT = 72;
const START_HOUR = 8;
const END_HOUR = 21;

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

type FerieRecord = { staff_id: string; data_inizio: string; data_fine: string; tipo: string };

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}
function formatNavDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("it-IT", {
    weekday: "short", day: "numeric", month: "short",
  });
}
function getWeekDays(selectedDate: string) {
  const d = new Date(selectedDate + "T00:00:00");
  const dow = d.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const shortDays = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push({ date: toDateStr(day), label: shortDays[day.getDay()], dayNum: day.getDate() });
  }
  const sunday = toDateStr(new Date(monday.getTime() + 6 * 86400000));
  return { monday: toDateStr(monday), sunday, days };
}

// Lighter version of a hex color for card backgrounds
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getCategoriaAbbr(categoria: string) {
  const map: Record<string, string> = {
    viso: "FACE", corpo: "BODY", massaggi: "MASS", laser: "LASER",
    spa: "SPA", capelli: "HC", unghie: "NAIL", sopracciglia: "BROW",
  };
  return map[categoria?.toLowerCase()] || categoria?.toUpperCase().slice(0, 4) || "";
}

function AppointmentCard({
  apt, topPx, heightPx, staffColor, onStatusChange,
}: {
  apt: Appointment; topPx: number; heightPx: number; staffColor: string;
  onStatusChange: (id: string, stato: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const startTime = apt.ora_inizio.slice(0, 5);
  const endTime = apt.ora_fine ? apt.ora_fine.slice(0, 5) : null;
  const clientName = apt.clients ? `${apt.clients.nome} ${apt.clients.cognome}` : "Cliente";
  const serviceName = apt.services?.nome ?? "";
  const categoria = apt.services?.categoria ?? "";
  const abbr = getCategoriaAbbr(categoria);
  const isCancelled = apt.stato === "cancellato";
  const isCompleted = apt.stato === "completato";
  const isNoShow = apt.stato === "no_show";

  const bgColor = isCancelled || isNoShow
    ? "rgba(156,163,175,0.15)"
    : isCompleted
    ? hexToRgba(staffColor, 0.25)
    : hexToRgba(staffColor, 0.18);

  const borderColor = isCancelled || isNoShow ? "#9ca3af" : staffColor;
  const textColor = isCancelled || isNoShow ? "#9ca3af" : "#1a1a2e";

  return (
    <div
      className="absolute left-1 right-1 cursor-pointer overflow-hidden rounded-lg transition-all"
      style={{
        top: topPx, height: heightPx, zIndex: hovered ? 30 : 10,
        backgroundColor: bgColor,
        borderLeft: `3px solid ${borderColor}`,
        boxShadow: hovered ? "0 4px 12px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!hovered ? (
        <div className="px-2 py-1.5 h-full flex flex-col gap-0.5 overflow-hidden">
          <p className="text-[10px] font-medium leading-none" style={{ color: borderColor }}>
            {startTime}{endTime ? ` - ${endTime}` : ""}
            {isCompleted && <span className="ml-1">✓</span>}
          </p>
          <p className="text-xs font-bold leading-tight truncate" style={{ color: textColor }}>
            {clientName}
          </p>
          {heightPx > 48 && serviceName && (
            <p className="text-[10px] leading-tight truncate" style={{ color: isCancelled ? "#9ca3af" : "#6b7280" }}>
              {abbr ? `${abbr} | ` : ""}{serviceName}
            </p>
          )}
          {apt.note && heightPx > 68 && (
            <p className="text-[10px] italic leading-tight truncate text-muted-foreground">{apt.note}</p>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg p-2"
          style={{ backgroundColor: hexToRgba(staffColor, 0.95) }}>
          <p className="text-[11px] font-bold text-white truncate max-w-full px-1">{clientName}</p>
          <p className="text-[10px] text-white/80 truncate max-w-full px-1">{serviceName}</p>
          <div className="flex flex-wrap gap-1 justify-center mt-1">
            {apt.stato !== "completato" && (
              <button onClick={(e) => { e.stopPropagation(); onStatusChange(apt.id, "completato"); }}
                className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white/20 text-white hover:bg-white/40">
                <CheckCircle2 className="h-3 w-3" />Completa
              </button>
            )}
            <Link href={`/agenda/checkout/${apt.id}`} onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white/20 text-white hover:bg-white/40">
              <Euro className="h-3 w-3" />Checkout
            </Link>
            {apt.stato !== "cancellato" && (
              <button onClick={(e) => { e.stopPropagation(); onStatusChange(apt.id, "cancellato"); }}
                className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white/20 text-white hover:bg-white/40">
                <XCircle className="h-3 w-3" />Cancella
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
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [ferieList, setFerieList] = useState<FerieRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  // Mobile swipe: 3 colonne alla volta
  const MOBILE_COLS = 3;
  const [mobileGroup, setMobileGroup] = useState(0);
  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 40) return; // ignora micro-swipe
    const totalGroups = Math.ceil(staffList.length / MOBILE_COLS);
    if (diff > 0) setMobileGroup(g => Math.min(totalGroups - 1, g + 1)); // swipe sx → gruppo successivo
    else setMobileGroup(g => Math.max(0, g - 1)); // swipe dx → gruppo precedente
    touchStartX.current = null;
  }

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    getStaff(true).then(setStaffList).catch(console.error);
  }, []);

  const fetchAppointments = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const rows = await getAppointments(date);
      setAppointments(rows as unknown as Appointment[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchWeekCounts = useCallback(async (date: string) => {
    const { monday, sunday } = getWeekDays(date);
    try {
      const rows = await getAppointmentsByRange(monday, sunday);
      const counts: Record<string, number> = {};
      for (const row of rows as { data: string; stato: string }[]) {
        if (row.stato !== "cancellato") {
          counts[String(row.data).slice(0, 10)] = (counts[String(row.data).slice(0, 10)] || 0) + 1;
        }
      }
      setWeekCounts(counts);
    } catch (err) { console.error(err); }
  }, []);

  const fetchFerie = useCallback(async () => {
    try {
      const rows = await getStaffFerie();
      setFerieList(rows as unknown as FerieRecord[]);
    } catch { /* table might not exist yet */ }
  }, []);

  useEffect(() => { fetchAppointments(selectedDate); }, [selectedDate, fetchAppointments, refreshKey]);
  useEffect(() => { fetchWeekCounts(selectedDate); }, [selectedDate, fetchWeekCounts]);
  useEffect(() => { fetchFerie(); }, [fetchFerie]);

  async function handleStatusChange(id: string, stato: string) {
    try {
      await updateAppointmentStatus(id, stato);
      fetchAppointments(selectedDate);
    } catch { alert("Errore aggiornamento stato"); }
  }

  // Time grid
  const hours: number[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);
  const gridHeightPx = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  // Current time line
  const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
  const currentTimePx = ((currentMins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const showTimeLine = selectedDate === today && currentMins >= START_HOUR * 60 && currentMins <= END_HOUR * 60;

  // Weekly strip
  const { days: weekDays } = getWeekDays(selectedDate);
  const totalAppointments = appointments.filter(a => a.stato !== "cancellato").length;

  // Check ferie for a staff on selected date
  function isOnFerie(staffId: string) {
    return ferieList.some(f =>
      f.staff_id === staffId &&
      selectedDate >= f.data_inizio &&
      selectedDate <= f.data_fine
    );
  }

  // Build appointment positions per staff
  function getAptCards(forStaffId: string | null) {
    const filtered = forStaffId === null
      ? appointments.filter(a => !a.staff_id)
      : appointments.filter(a => a.staff_id === forStaffId);
    return filtered.map(apt => {
      const [h, m] = apt.ora_inizio.slice(0, 5).split(":").map(Number);
      const startMins = h * 60 + m;
      const duration = apt.services?.durata || 60;
      const topPx = ((startMins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      const heightPx = Math.max((duration / 60) * HOUR_HEIGHT, 44);
      return { apt, topPx, heightPx };
    });
  }

  // Unassigned appointments
  const unassignedCards = getAptCards(null);

  return (
    <div className="-mx-4 -mt-6 sm:-mx-6 flex flex-col" style={{ height: "calc(100vh - 0px)" }}>

      {/* ── TOP TOOLBAR ── */}
      <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2.5 shadow-sm flex-wrap">
        {/* Left controls */}
        <button
          onClick={() => setSelectedDate(today)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedDate === today ? "border-brown bg-brown text-white" : "border-border bg-white text-brown hover:bg-cream-dark"
          }`}
        >
          Oggi
        </button>

        <div className="flex items-center rounded-lg border border-border bg-white overflow-hidden">
          <button onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="px-2.5 py-1.5 text-brown hover:bg-cream-dark transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 py-1.5 text-sm font-semibold text-brown whitespace-nowrap">
            {formatNavDate(selectedDate)}
          </span>
          <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="px-2.5 py-1.5 text-brown hover:bg-cream-dark transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Week mini strip */}
        <div className="hidden md:flex items-center gap-0.5 rounded-lg border border-border bg-white p-1">
          {weekDays.map((day) => {
            const isSelected = day.date === selectedDate;
            const isToday = day.date === today;
            const count = weekCounts[day.date] || 0;
            return (
              <button key={day.date} onClick={() => setSelectedDate(day.date)}
                className={`relative flex flex-col items-center rounded-md px-2.5 py-1 text-xs transition-colors ${
                  isSelected ? "bg-brown text-white" : isToday ? "bg-rose/10 text-rose" : "text-muted-foreground hover:bg-cream-dark"
                }`}>
                <span className="text-[10px]">{day.label}</span>
                <span className="font-bold">{day.dayNum}</span>
                {count > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${isSelected ? "bg-rose" : "bg-rose"}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Stats */}
        <span className="hidden lg:block text-xs text-muted-foreground">
          {loading ? "..." : <><strong className="text-brown">{totalAppointments}</strong> appuntamenti</>}
        </span>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setRefreshKey(k => k + 1)}
            className={`rounded-lg border border-border bg-white p-1.5 text-muted-foreground hover:bg-cream-dark transition-colors ${loading ? "animate-spin" : ""}`}>
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link href="/impostazioni"
            className="rounded-lg border border-border bg-white p-1.5 text-muted-foreground hover:bg-cream-dark">
            <Settings2 className="h-4 w-4" />
          </Link>
          <Link href="/agenda/nuovo"
            className="rounded-lg border border-border bg-white p-1.5 text-muted-foreground hover:bg-cream-dark">
            <CalendarDays className="h-4 w-4" />
          </Link>
          <Link
            href={`/agenda/nuovo?data=${selectedDate}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brown px-3 py-1.5 text-sm font-semibold text-white hover:bg-brown/90"
          >
            <Plus className="h-4 w-4" />
            Aggiungi
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </Link>
        </div>
      </div>

      {/* ── CALENDAR GRID ── */}
      <div
        className="flex-1 overflow-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex min-w-max">

          {/* Hour labels column */}
          <div className="sticky left-0 z-20 w-10 sm:w-14 shrink-0 bg-card border-r border-border">
            {/* Spacer for staff header */}
            <div className="h-[72px] border-b border-border bg-card" />
            {hours.map(h => (
              <div key={h} className="flex items-start justify-end pr-2"
                style={{ height: HOUR_HEIGHT }}>
                <span className="text-[11px] text-muted-foreground -mt-2">
                  {h < 10 ? `0${h}` : h}:00
                </span>
              </div>
            ))}
          </div>

          {/* Staff columns — mobile: 3 per gruppo, desktop: tutte */}
          {staffList.map((staff, idx) => {
            const totalGroups = Math.ceil(staffList.length / MOBILE_COLS);
            const currentGroup = Math.min(mobileGroup, totalGroups - 1);
            const inMobileView = idx >= currentGroup * MOBILE_COLS && idx < (currentGroup + 1) * MOBILE_COLS;
            return { staff, idx, inMobileView };
          }).map(({ staff, inMobileView }) => {
            const aptCards = getAptCards(staff.id);
            const onFerie = isOnFerie(staff.id);
            return (
              <div key={staff.id} className={`flex-1 min-w-[88px] sm:min-w-[160px] max-w-[280px] border-r border-border/50 flex flex-col ${inMobileView ? "" : "hidden sm:flex"}`}>

                {/* Staff header */}
                <div className="sticky top-0 z-20 flex flex-col items-center justify-center gap-1 border-b border-border bg-card px-2 py-2"
                  style={{ height: 72 }}>
                  <div className="relative">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full text-sm font-bold text-white overflow-hidden"
                      style={{ backgroundColor: staff.colore }}>
                      {(staff as any).avatar_url ? (
                        <Image src={(staff as any).avatar_url} alt={staff.nome} width={40} height={40} className="h-full w-full object-cover" />
                      ) : staff.nome[0]}
                    </div>
                    <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 0 2px white, 0 0 0 3.5px ${staff.colore}` }} />
                  </div>
                  <span className="hidden sm:block text-[11px] font-semibold text-brown">{staff.nome}</span>
                  <span className="sm:hidden text-[9px] font-semibold text-brown truncate max-w-[80px] text-center">{staff.nome.split(" ")[0]}</span>
                </div>

                {/* Time area */}
                <div className="relative" style={{ height: gridHeightPx }}>

                  {/* Hour lines */}
                  {hours.map(h => (
                    <div key={h} className="absolute left-0 right-0 border-t border-border/30"
                      style={{ top: (h - START_HOUR) * HOUR_HEIGHT }} />
                  ))}
                  {hours.slice(0, -1).map(h => (
                    <div key={`h-${h}`} className="absolute left-0 right-0 border-t border-border/15 border-dashed"
                      style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                  ))}

                  {/* Ferie block */}
                  {onFerie && (
                    <div className="absolute inset-x-1 top-0 bottom-0 z-10 flex items-center justify-center rounded-lg bg-gray-200/80 border border-gray-300">
                      <div className="text-center">
                        <p className="text-xs font-semibold text-gray-500">Ferie</p>
                      </div>
                    </div>
                  )}

                  {/* Current time line */}
                  {showTimeLine && (
                    <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                      style={{ top: currentTimePx }}>
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" style={{ marginLeft: -5 }} />
                      <div className="h-[2px] flex-1 bg-red-500/70" />
                    </div>
                  )}

                  {/* Clickable empty slots */}
                  {!onFerie && hours.slice(0, -1).map(h => (
                    <Link key={`slot-${h}`}
                      href={`/agenda/nuovo?data=${selectedDate}&ora=${h < 10 ? `0${h}` : h}:00&staffId=${staff.id}`}
                      className="absolute left-0 right-0 hover:bg-rose/5 transition-colors"
                      style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT, zIndex: 1 }} />
                  ))}

                  {/* Appointment cards */}
                  {!onFerie && aptCards.map(({ apt, topPx, heightPx }) => (
                    <AppointmentCard key={apt.id} apt={apt} topPx={topPx} heightPx={heightPx}
                      staffColor={staff.colore} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Unassigned column (only if there are unassigned appointments) */}
          {unassignedCards.length > 0 && (
            <div className="flex-1 min-w-[88px] sm:min-w-[160px] max-w-[280px] border-r border-border/50 flex flex-col">
              <div className="sticky top-0 z-20 flex flex-col items-center justify-center gap-1 border-b border-border bg-card px-2 py-2"
                style={{ height: 72 }}>
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-500">?</div>
                <span className="text-[9px] sm:text-[11px] font-semibold text-muted-foreground text-center">N/A</span>
              </div>
              <div className="relative" style={{ height: gridHeightPx }}>
                {hours.map(h => (
                  <div key={h} className="absolute left-0 right-0 border-t border-border/30"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT }} />
                ))}
                {unassignedCards.map(({ apt, topPx, heightPx }) => (
                  <AppointmentCard key={apt.id} apt={apt} topPx={topPx} heightPx={heightPx}
                    staffColor="#9ca3af" onStatusChange={handleStatusChange} />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── MOBILE BOTTOM BAR (stile Fresha) ── */}
      <div className="sm:hidden border-t border-border bg-card">
        {/* Indicatori gruppo operatrici */}
        {staffList.length > MOBILE_COLS && (
          <div className="flex items-center justify-center gap-1.5 pt-1.5">
            {Array.from({ length: Math.ceil(staffList.length / MOBILE_COLS) }).map((_, i) => (
              <button key={i} onClick={() => setMobileGroup(i)}
                className={`h-1.5 rounded-full transition-all ${i === mobileGroup ? "w-4 bg-rose" : "w-1.5 bg-border"}`}
              />
            ))}
          </div>
        )}
        <div className="flex items-center justify-around px-4 py-2">
          <button onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setSelectedDate(today)}
            className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground">
            <CalendarDays className="h-5 w-5" />
            <span className="text-[9px]">Oggi</span>
          </button>
          <Link
            href={`/agenda/nuovo?data=${selectedDate}`}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-rose shadow-lg text-white"
          >
            <Plus className="h-6 w-6" />
          </Link>
          <button onClick={() => setRefreshKey(k => k + 1)}
            className={`flex flex-col items-center gap-0.5 p-2 text-muted-foreground ${loading ? "animate-spin" : ""}`}>
            <RefreshCw className="h-5 w-5" />
            <span className="text-[9px]">Aggiorna</span>
          </button>
          <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="flex flex-col items-center gap-0.5 p-2 text-muted-foreground">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-rose/30 border-t-rose" />
      </div>
    }>
      <AgendaContent />
    </Suspense>
  );
}
