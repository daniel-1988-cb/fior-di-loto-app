"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui";

interface Staff {
  id: string;
  nome: string;
  cognome?: string | null;
  colore: string;
  avatar_url?: string | null;
}

interface Appointment {
  id: string;
  staff_id: string | null;
  operatrice_id: string | null;
  ora_inizio: string;
  ora_fine: string;
  stato: string;
  clients?: { nome: string; cognome: string; telefono?: string | null } | null;
  services?: { nome: string; durata: number; prezzo?: number; categoria?: string } | null;
}

interface CalendarGridProps {
  staff: Staff[];
  appointments: Appointment[];
  startHour?: number;
  endHour?: number;
  slotMinutes?: number;
  date: string;
}

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
  startHour = 8,
  endHour = 21,
  slotMinutes = 30,
  date,
}: CalendarGridProps) {
  const [nowMin, setNowMin] = useState<number | null>(null);

  const isToday = date === new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!isToday) {
      setNowMin(null);
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
          {staff.map((s) => {
            const apts = byStaff.get(s.id) ?? [];
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
                    <Link
                      key={`slot-${minute}`}
                      href={`/agenda/nuovo?data=${date}&ora=${ora}&staffId=${s.id}`}
                      aria-label={`Crea appuntamento ${ora} con ${s.nome}`}
                      className={cn(
                        "absolute left-0 right-0 block transition-colors hover:bg-primary/5",
                        half
                          ? "border-b border-dashed border-border/40"
                          : "border-b border-border/60"
                      )}
                      style={{ top, height: 30 * pxPerMinute }}
                    />
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
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={cn(
                        "absolute left-1 right-1 overflow-hidden rounded-md border px-2 py-1 text-left transition-all hover:shadow-md",
                        cancelled && "opacity-60 line-through"
                      )}
                      style={{
                        top,
                        height,
                        backgroundColor: hexToRgba(color, 0.22),
                        borderColor: hexToRgba(color, 0.55),
                      }}
                      title={`${a.ora_inizio.slice(0, 5)} - ${a.ora_fine.slice(0, 5)} · ${
                        a.clients?.nome ?? ""
                      } ${a.clients?.cognome ?? ""} · ${a.services?.nome ?? ""}`}
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
    </div>
  );
}
