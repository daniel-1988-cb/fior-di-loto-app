"use client";

import { useEffect, useMemo, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import { SlotQuickActionsPopover } from "@/components/agenda/slot-quick-actions-popover";
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

interface CalendarGridProps {
  staff: Staff[];
  appointments: Appointment[];
  blockedSlots?: BlockedSlot[];
  startHour?: number;
  endHour?: number;
  slotMinutes?: number;
  date: string;
}

const TIPO_LABEL: Record<string, string> = {
  personalizza: "Blocco",
  formazione: "Formazione",
  ferie: "Ferie",
  pausa: "Pausa",
  altro: "Altro",
};

function minutesFromTime(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function CalendarGrid({
  staff,
  appointments,
  blockedSlots = [],
  startHour = 8,
  endHour = 21,
  date,
}: CalendarGridProps) {
  const router = useRouter();
  const [nowMin, setNowMin] = useState<number | null>(null);
  const [popover, setPopover] = useState<{
    open: boolean;
    x: number;
    y: number;
    time: string;
    staffId: string;
  }>({ open: false, x: 0, y: 0, time: "", staffId: "" });
  const [activeAppt, setActiveAppt] = useState<AppointmentDrawerData | null>(null);
  const [checkoutApptId, setCheckoutApptId] = useState<string | null>(null);

  function openApptDrawer(a: Appointment, s: Staff) {
    setActiveAppt({
      id: a.id,
      clientId: a.client_id ?? null,
      clientName: `${a.clients?.nome ?? ""} ${a.clients?.cognome ?? ""}`.trim() || "Cliente",
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

  const isToday = date === new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!isToday) {
      startTransition(() => setNowMin(null));
      return;
    }
    const update = () => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    };
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, [isToday]);

  const slots = useMemo(() => {
    const out: { label: string; minutes: number }[] = [];
    for (let h = startHour; h < endHour; h++) {
      out.push({ label: `${h.toString().padStart(2, "0")}:00`, minutes: h * 60 });
    }
    return out;
  }, [startHour, endHour]);

  const totalMinutes = (endHour - startHour) * 60;
  const pxPerMinute = 1.4; // 30min = 42px
  const gridHeight = totalMinutes * pxPerMinute;

  const byStaff = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const s of staff) map.set(s.id, []);
    for (const a of appointments) {
      const sid = a.staff_id ?? a.operatrice_id;
      if (sid && map.has(sid)) map.get(sid)!.push(a);
    }
    return map;
  }, [staff, appointments]);

  const nowOffset = nowMin != null ? (nowMin - startHour * 60) * pxPerMinute : null;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex border-b border-border">
        <div className="w-16 shrink-0 border-r border-border" />
        <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${staff.length || 1}, minmax(160px,1fr))` }}>
          {staff.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">Nessuno staff configurato</div>
          ) : (
            staff.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-2 border-r border-border p-3 last:border-r-0">
                <Avatar
                  name={`${s.nome} ${s.cognome ?? ""}`}
                  src={s.avatar_url}
                  size="md"
                  color={s.colore}
                />
                <p className="truncate text-xs font-medium" title={s.nome}>
                  {s.nome}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="relative flex">
        <div className="w-16 shrink-0 border-r border-border" style={{ height: gridHeight }}>
          {slots.map((slot, i) => (
            <div
              key={slot.label}
              className="border-b border-border px-2 pt-1 text-[11px] text-muted-foreground"
              style={{ height: 60 * pxPerMinute }}
              aria-hidden={i === 0}
            >
              {slot.label}
            </div>
          ))}
        </div>

        <div
          className="relative grid flex-1"
          style={{
            gridTemplateColumns: `repeat(${staff.length || 1}, minmax(160px,1fr))`,
            height: gridHeight,
          }}
        >
          {appointments.length === 0 && staff.length > 0 && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <p className="rounded-lg bg-card/80 px-4 py-2 text-center text-sm text-muted-foreground backdrop-blur-sm">
                Giornata libera. Clicca su uno slot per aggiungere il primo appuntamento.
              </p>
            </div>
          )}
          {staff.map((s) => {
            const apts = byStaff.get(s.id) ?? [];
            // Blocchi di questo staff + blocchi globali (staff_id = null)
            const blocks = blockedSlots.filter(
              (b) => b.staffId === s.id || b.staffId === null,
            );
            return (
              <div
                key={s.id}
                className="relative border-r border-border last:border-r-0"
              >
                {/* clickable 30-min slots (below appointments) */}
                {slots.flatMap((slot, i) => [
                  { minute: slot.minutes, top: i * 60 * pxPerMinute, half: false },
                  { minute: slot.minutes + 30, top: (i * 60 + 30) * pxPerMinute, half: true },
                ]).map(({ minute, top, half }) => {
                  const hh = Math.floor(minute / 60).toString().padStart(2, "0");
                  const mm = (minute % 60).toString().padStart(2, "0");
                  const ora = `${hh}:${mm}`;
                  return (
                    <button
                      type="button"
                      key={`slot-${minute}`}
                      aria-label={`Azioni rapide slot ${ora} con ${s.nome}`}
                      onClick={(e) => {
                        setPopover({
                          open: true,
                          x: e.clientX,
                          y: e.clientY,
                          time: ora,
                          staffId: s.id,
                        });
                      }}
                      className={cn(
                        "absolute left-0 right-0 block cursor-pointer transition-colors hover:bg-primary/5",
                        half
                          ? "border-b border-dashed border-border/40"
                          : "border-b border-border/60"
                      )}
                      style={{ top, height: 30 * pxPerMinute }}
                    />
                  );
                })}

                {/* blocked slots (render sotto gli appuntamenti) */}
                {blocks.map((b) => {
                  const startM = minutesFromTime(b.oraInizio) - startHour * 60;
                  const endM = minutesFromTime(b.oraFine) - startHour * 60;
                  const top = Math.max(0, startM * pxPerMinute);
                  const height = Math.max(24, (endM - startM) * pxPerMinute);
                  const label = b.titolo || TIPO_LABEL[b.tipo] || "Blocco";
                  return (
                    <div
                      key={`block-${b.id}-${s.id}`}
                      className="absolute left-1 right-1 overflow-hidden rounded-md border border-border/80 text-left"
                      style={{
                        top,
                        height,
                        backgroundColor: "rgba(120,120,120,0.15)",
                        backgroundImage:
                          "repeating-linear-gradient(45deg, rgba(120,120,120,0.18) 0 6px, transparent 6px 12px)",
                      }}
                      title={`${b.oraInizio} - ${b.oraFine} · ${label}`}
                    >
                      <div className="flex items-center gap-1 px-2 pt-1 text-[10px] font-semibold text-muted-foreground">
                        {b.oraInizio} - {b.oraFine}
                      </div>
                      <div className="truncate px-2 text-[11px] font-medium text-foreground">
                        {label}
                      </div>
                    </div>
                  );
                })}

                {/* appointments */}
                {apts.map((a) => {
                  const startM = minutesFromTime(a.ora_inizio) - startHour * 60;
                  const endM = minutesFromTime(a.ora_fine) - startHour * 60;
                  const top = Math.max(0, startM * pxPerMinute);
                  const height = Math.max(30, (endM - startM) * pxPerMinute);
                  const color = s.colore ?? "#6B4EFF";
                  const cancelled = a.stato === "cancellato";
                  const paid = !!a.pagato_at;
                  const tooltipText = [
                    `${a.ora_inizio.slice(0, 5)} - ${a.ora_fine.slice(0, 5)}`,
                    `${a.clients?.nome ?? ""} ${a.clients?.cognome ?? ""}`.trim() || "Cliente",
                    a.services?.nome ?? "",
                    a.services?.prezzo != null ? `€ ${Number(a.services.prezzo).toFixed(2)}` : "",
                    paid ? "✓ Pagato" : "",
                    a.clients?.telefono ? `📞 ${a.clients.telefono}` : "",
                  ].filter(Boolean).join("\n");
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openApptDrawer(a, s);
                      }}
                      className={cn(
                        "absolute left-1 right-1 overflow-hidden rounded-md border px-2 py-1 text-left transition-all hover:shadow-md hover:ring-2 hover:ring-rose/40",
                        cancelled && "opacity-60 line-through"
                      )}
                      style={{
                        top,
                        height,
                        backgroundColor: paid
                          ? "rgba(140,140,140,0.20)"
                          : hexToRgba(color, 0.22),
                        borderColor: paid
                          ? "rgba(140,140,140,0.55)"
                          : hexToRgba(color, 0.55),
                      }}
                      title={tooltipText}
                    >
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-foreground">
                        {a.ora_inizio.slice(0, 5)} - {a.ora_fine.slice(0, 5)}
                      </div>
                      <div className="truncate text-[11px] font-medium">
                        {a.clients?.nome ?? ""} {a.clients?.cognome ?? ""}
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {a.services?.nome ?? ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* now line */}
          {nowOffset != null && nowOffset >= 0 && nowOffset <= gridHeight && (
            <div
              className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
              style={{ top: nowOffset }}
            >
              <span className="ml-[-30px] rounded-md bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                {new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <div className="h-[2px] flex-1 bg-danger" />
            </div>
          )}
        </div>
      </div>

      <SlotQuickActionsPopover
        open={popover.open}
        x={popover.x}
        y={popover.y}
        slotTime={popover.time}
        slotDate={date}
        slotStaffId={popover.staffId}
        onClose={() => setPopover((p) => ({ ...p, open: false }))}
      />

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
