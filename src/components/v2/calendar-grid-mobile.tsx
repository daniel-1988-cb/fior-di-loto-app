"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  AppointmentDetailDrawer,
  type AppointmentDrawerData,
} from "@/components/agenda/appointment-detail-drawer";
import { CheckoutModal } from "@/components/agenda/checkout/checkout-modal";

interface Staff {
  id: string;
  nome: string;
  cognome?: string | null;
  colore: string;
  avatar_url?: string | null;
}

interface Appointment {
  id: string;
  client_id?: string | null;
  staff_id: string | null;
  operatrice_id: string | null;
  data?: string;
  ora_inizio: string;
  ora_fine: string;
  stato: string;
  pagato_at?: string | null;
  note?: string | null;
  clients?: { nome: string; cognome: string; telefono?: string | null } | null;
  services?: { nome: string; durata: number; prezzo?: number; categoria?: string } | null;
  staff?: { id: string; nome: string; colore?: string | null } | null;
}

interface BlockedSlot {
  id: string;
  staffId: string | null;
  oraInizio: string;
  oraFine: string;
  tipo: string;
  titolo: string | null;
}

interface CalendarGridMobileProps {
  staff: Staff[];
  appointments: Appointment[];
  blockedSlots?: BlockedSlot[];
  date: string;
}

const TIPO_LABEL: Record<string, string> = {
  personalizza: "Blocco",
  formazione: "Formazione",
  ferie: "Ferie",
  pausa: "Pausa",
  altro: "Altro",
};

function minutesFromTime(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const bigint = parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16,
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Chip with initials-based color dot */
function StaffChip({
  staff,
  selected,
  onClick,
}: {
  staff: Staff;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        selected
          ? "border-transparent text-white shadow-sm"
          : "border-border bg-card text-muted-foreground",
      )}
      style={
        selected
          ? { backgroundColor: staff.colore }
          : { borderColor: "var(--border)" }
      }
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: staff.colore }}
      />
      {staff.nome}
    </button>
  );
}

export function CalendarGridMobile({
  staff,
  appointments,
  blockedSlots = [],
  date,
}: CalendarGridMobileProps) {
  const router = useRouter();

  /** null = "Tutti" */
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [activeAppt, setActiveAppt] = useState<AppointmentDrawerData | null>(
    null,
  );
  const [checkoutApptId, setCheckoutApptId] = useState<string | null>(null);

  function openApptDrawer(a: Appointment, s: Staff) {
    setActiveAppt({
      id: a.id,
      clientId: a.client_id ?? null,
      clientName:
        `${a.clients?.nome ?? ""} ${a.clients?.cognome ?? ""}`.trim() ||
        "Cliente",
      clientPhone: a.clients?.telefono ?? null,
      serviceName: a.services?.nome ?? "Servizio",
      servicePrice: a.services?.prezzo ?? null,
      serviceDurata: a.services?.durata ?? null,
      staffId: s.id,
      staffName: s.nome,
      staffColore: s.colore,
      date: a.data ?? date,
      oraInizio: a.ora_inizio.slice(0, 5),
      oraFine: a.ora_fine.slice(0, 5),
      stato: a.stato,
      pagatoAt: a.pagato_at ?? null,
      note: a.note ?? null,
    });
  }

  /** Map staffId → Staff object for quick lookup */
  const staffMap = useMemo(
    () => new Map(staff.map((s) => [s.id, s])),
    [staff],
  );

  /** Filtered + sorted appointments */
  const visibleAppointments = useMemo(() => {
    const filtered =
      selectedStaffId === null
        ? appointments
        : appointments.filter(
            (a) =>
              (a.staff_id ?? a.operatrice_id) === selectedStaffId,
          );
    return [...filtered].sort(
      (a, b) =>
        minutesFromTime(a.ora_inizio) - minutesFromTime(b.ora_inizio),
    );
  }, [appointments, selectedStaffId]);

  /** Blocked slots visible for the filter */
  const visibleBlocked = useMemo(() => {
    const filtered =
      selectedStaffId === null
        ? blockedSlots
        : blockedSlots.filter(
            (b) => b.staffId === selectedStaffId || b.staffId === null,
          );
    return [...filtered].sort(
      (a, b) =>
        minutesFromTime(a.oraInizio) - minutesFromTime(b.oraInizio),
    );
  }, [blockedSlots, selectedStaffId]);

  const isEmpty = visibleAppointments.length === 0 && visibleBlocked.length === 0;

  /** Combine and sort appointments + blocked slots by start time */
  interface ApptItem { type: "appt"; data: Appointment }
  interface BlockItem { type: "block"; data: BlockedSlot }
  type Item = ApptItem | BlockItem;

  const items: Item[] = useMemo(() => {
    const apptItems: Item[] = visibleAppointments.map((a) => ({ type: "appt", data: a }));
    const blockItems: Item[] = visibleBlocked.map((b) => ({ type: "block", data: b }));
    return [...apptItems, ...blockItems].sort((a, b) => {
      const aMin =
        a.type === "appt"
          ? minutesFromTime(a.data.ora_inizio)
          : minutesFromTime((a.data as BlockedSlot).oraInizio);
      const bMin =
        b.type === "appt"
          ? minutesFromTime(b.data.ora_inizio)
          : minutesFromTime((b.data as BlockedSlot).oraInizio);
      return aMin - bMin;
    });
  }, [visibleAppointments, visibleBlocked]);

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Staff filter chips */}
      {staff.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b border-border px-3 py-3 scrollbar-hide">
          {/* "Tutti" chip */}
          <button
            type="button"
            onClick={() => setSelectedStaffId(null)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              selectedStaffId === null
                ? "border-transparent bg-foreground text-background shadow-sm"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            Tutti
          </button>

          {staff.map((s) => (
            <StaffChip
              key={s.id}
              staff={s}
              selected={selectedStaffId === s.id}
              onClick={() =>
                setSelectedStaffId((prev) => (prev === s.id ? null : s.id))
              }
            />
          ))}
        </div>
      )}

      {/* Appointment list */}
      <div className="divide-y divide-border">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <span className="text-4xl">🌸</span>
            <p className="text-sm font-medium text-foreground">
              Giornata libera.
            </p>
            <p className="text-xs text-muted-foreground">
              Tocca + per aggiungere un appuntamento.
            </p>
          </div>
        ) : (
          items.map((item) => {
            if (item.type === "block") {
              const b = item.data as BlockedSlot;
              const label = b.titolo || TIPO_LABEL[b.tipo] || "Blocco";
              return (
                <div
                  key={`block-${b.id}`}
                  className="flex min-h-[44px] items-center gap-3 px-4 py-3"
                  style={{
                    background:
                      "repeating-linear-gradient(45deg, rgba(120,120,120,0.08) 0 6px, transparent 6px 12px)",
                  }}
                >
                  <div className="flex w-16 shrink-0 flex-col items-end">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {b.oraInizio.slice(0, 5)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {b.oraFine.slice(0, 5)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-muted-foreground">
                      {label}
                    </p>
                    {b.staffId && staffMap.get(b.staffId) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {staffMap.get(b.staffId)!.nome}
                      </p>
                    )}
                  </div>
                </div>
              );
            }

            const a = item.data as Appointment;
            const sid = a.staff_id ?? a.operatrice_id;
            const s = sid ? (staffMap.get(sid) ?? staff[0]) : staff[0];
            if (!s) return null;

            const colour = s.colore ?? "#6B4EFF";
            const paid = !!a.pagato_at;
            const cancelled = a.stato === "cancellato";
            const clientName =
              `${a.clients?.nome ?? ""} ${a.clients?.cognome ?? ""}`.trim() ||
              "Cliente";

            return (
              <button
                key={a.id}
                type="button"
                onClick={() => openApptDrawer(a, s)}
                className={cn(
                  "flex min-h-[44px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 active:bg-muted",
                  cancelled && "opacity-60",
                )}
              >
                {/* Time column */}
                <div className="flex w-16 shrink-0 flex-col items-end">
                  <span className="text-xs font-semibold text-foreground">
                    {a.ora_inizio.slice(0, 5)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {a.ora_fine.slice(0, 5)}
                  </span>
                </div>

                {/* Color bar */}
                <div
                  className="h-10 w-1 shrink-0 rounded-full"
                  style={{
                    backgroundColor: paid
                      ? "rgba(140,140,140,0.55)"
                      : hexToRgba(colour, 0.8),
                  }}
                />

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-semibold text-foreground",
                      cancelled && "line-through",
                    )}
                  >
                    {clientName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.services?.nome ?? ""}
                    {a.services?.prezzo != null
                      ? ` · €${Number(a.services.prezzo).toFixed(0)}`
                      : ""}
                  </p>
                </div>

                {/* Staff badge */}
                {selectedStaffId === null && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: colour }}
                  >
                    {s.nome.slice(0, 8)}
                  </span>
                )}

                {/* Paid badge */}
                {paid && (
                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Pagato
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      <AppointmentDetailDrawer
        appt={activeAppt}
        onClose={() => setActiveAppt(null)}
        onOpenCheckout={(id) => setCheckoutApptId(id)}
      />

      <CheckoutModal
        open={!!checkoutApptId}
        appointmentId={checkoutApptId}
        onClose={() => setCheckoutApptId(null)}
        onCompleted={() => router.refresh()}
      />
    </div>
  );
}
