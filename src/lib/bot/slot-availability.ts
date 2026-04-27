"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { humanLabelForSlot } from "@/lib/bot/slot-time-utils";

// Helpers per il bot Marialucia: capire se uno slot proposto è libero,
// e — se non lo è — suggerire alternative immediatamente disponibili.
//
// Regole di "libero":
//   1. Lo staff è in turno (staff_turni copre la finestra). Se nessun turno è
//      definito per quel giorno → assumiamo NON disponibile (non vogliamo che
//      il bot dica "libero" in un giorno di chiusura senza turni inseriti).
//   2. Lo slot non sovrappone con appointments(stato in confermato/completato).
//   3. Lo slot non sovrappone con un blocked_slots di quello staff (oppure
//      blocked_slot global staff_id IS NULL).
//
// Tutto in TZ UTC: il chiamante passa ISO 8601, noi confrontiamo via Date e
// derive YYYY-MM-DD / HH:MM in UTC. La timezone del centro è Europe/Rome ma
// gestita a monte dal datetime parser nel webhook.
//
// NB: il file è `"use server"` quindi tutti gli export devono essere async.
// Helper sync (humanLabelForSlot, parser datetime) vivono in slot-time-utils.ts.

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

function isoToParts(iso: string): { date: string; time: string } | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return { date, time };
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function timeOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  // Confronto string-wise OK se entrambi sono "HH:MM" (lessicografico = cronologico).
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Verifica che lo slot [startDateTime, startDateTime+durataMinuti) sia libero
 * per lo staff indicato.
 *
 * Ritorna `{available:false, conflictReason}` con stringa human-friendly se
 * c'è almeno un conflitto. Errori DB → conflictReason="errore" e available=false
 * (stiamo cauti: in dubbio diciamo "non disponibile" e la richiesta finisce
 * comunque in coda review).
 */
export async function checkSlotAvailable(opts: {
  staffId: string;
  startDateTime: string;
  durataMinuti: number;
}): Promise<{ available: boolean; conflictReason?: string }> {
  const { staffId, startDateTime, durataMinuti } = opts;
  if (!startDateTime || !Number.isFinite(durataMinuti) || durataMinuti <= 0) {
    return { available: false, conflictReason: "parametri non validi" };
  }
  const startParts = isoToParts(startDateTime);
  if (!startParts) return { available: false, conflictReason: "datetime non valido" };
  const endIso = addMinutes(startDateTime, durataMinuti);
  const endParts = isoToParts(endIso);
  if (!endParts) return { available: false, conflictReason: "datetime non valido" };

  // Multi-day window non gestita: assumiamo che il singolo appt non scavalchi
  // la mezzanotte. Per il MVP è ok — i servizi durano 30-90min e il centro
  // chiude prima della mezzanotte.
  if (startParts.date !== endParts.date) {
    return { available: false, conflictReason: "slot scavalca mezzanotte" };
  }

  const supabase = createAdminClient();

  // 1. Turno staff per il giorno
  if (staffId) {
    const { data: turni, error: turniErr } = await supabase
      .from("staff_turni")
      .select("ora_inizio, ora_fine")
      .eq("staff_id", staffId)
      .eq("data", startParts.date);
    if (turniErr) {
      console.warn("[slot-availability] turni query failed:", turniErr.message);
      return { available: false, conflictReason: "errore turni" };
    }
    if (!turni || turni.length === 0) {
      return { available: false, conflictReason: "staff non in turno quel giorno" };
    }
    const inAnyTurno = turni.some((t) => {
      const tStart = String(t.ora_inizio).slice(0, 5);
      const tEnd = String(t.ora_fine).slice(0, 5);
      // Lo slot deve essere TUTTO contenuto in un turno
      return startParts.time >= tStart && endParts.time <= tEnd;
    });
    if (!inAnyTurno) {
      return { available: false, conflictReason: "fuori dal turno" };
    }
  }

  // 2. Appointments overlap
  const { data: appts, error: apptErr } = await supabase
    .from("appointments")
    .select("ora_inizio, ora_fine, stato")
    .eq("data", startParts.date)
    .eq("staff_id", staffId)
    .in("stato", ["confermato", "completato"]);
  if (apptErr) {
    console.warn("[slot-availability] appts query failed:", apptErr.message);
    return { available: false, conflictReason: "errore appuntamenti" };
  }
  for (const a of appts ?? []) {
    const aStart = String(a.ora_inizio).slice(0, 5);
    const aEnd = String(a.ora_fine ?? "").slice(0, 5);
    if (!aEnd || !TIME_RE.test(aEnd)) continue;
    if (timeOverlap(startParts.time, endParts.time, aStart, aEnd)) {
      return { available: false, conflictReason: "appuntamento già presente" };
    }
  }

  // 3. Blocked slots (per staff o global)
  const { data: blocks, error: blockErr } = await supabase
    .from("blocked_slots")
    .select("ora_inizio, ora_fine, staff_id")
    .eq("data", startParts.date)
    .or(`staff_id.eq.${staffId},staff_id.is.null`);
  if (blockErr) {
    console.warn("[slot-availability] blocked_slots query failed:", blockErr.message);
    return { available: false, conflictReason: "errore blocchi" };
  }
  for (const b of blocks ?? []) {
    const bStart = String(b.ora_inizio).slice(0, 5);
    const bEnd = String(b.ora_fine).slice(0, 5);
    if (timeOverlap(startParts.time, endParts.time, bStart, bEnd)) {
      return { available: false, conflictReason: "slot bloccato" };
    }
  }

  return { available: true };
}

/**
 * Restituisce fino a `maxResults` slot liberi attorno a `preferredDateTime`,
 * scansionando in step di 30 minuti dentro `searchRangeDays` giorni.
 *
 * Strategia: parte da preferredDateTime e va in avanti di 30 in 30 minuti
 * fino a fine giornata; se non ne trova abbastanza passa al giorno dopo
 * partendo dalle 09:00. Si ferma quando ha `maxResults` o esaurisce il range.
 */
export async function getAvailableSlotsAroundDate(opts: {
  staffId: string;
  preferredDateTime: string;
  durataMinuti: number;
  searchRangeDays?: number;
  maxResults?: number;
}): Promise<Array<{ startDateTime: string; humanLabel: string }>> {
  const {
    staffId,
    preferredDateTime,
    durataMinuti,
    searchRangeDays = 3,
    maxResults = 3,
  } = opts;
  if (!preferredDateTime || durataMinuti <= 0 || maxResults <= 0) return [];
  const start = new Date(preferredDateTime);
  if (isNaN(start.getTime())) return [];

  const out: Array<{ startDateTime: string; humanLabel: string }> = [];
  const stepMs = 30 * 60_000;
  const dayMs = 24 * 60 * 60_000;
  const horizonMs = searchRangeDays * dayMs;
  let cursorMs = start.getTime();
  // Round to next 30-min boundary so we don't propose 14:23
  const offset = cursorMs % stepMs;
  if (offset !== 0) cursorMs += stepMs - offset;

  const endHorizonMs = start.getTime() + horizonMs;
  let iterations = 0;
  const MAX_ITER = 200; // safety: ~100h di scansione 30min cap

  while (cursorMs <= endHorizonMs && out.length < maxResults && iterations < MAX_ITER) {
    iterations++;
    const iso = new Date(cursorMs).toISOString();
    const res = await checkSlotAvailable({
      staffId,
      startDateTime: iso,
      durataMinuti,
    });
    if (res.available) {
      out.push({ startDateTime: iso, humanLabel: humanLabelForSlot(iso) });
    }
    cursorMs += stepMs;
    // Skip night hours: 21:00 -> 09:00 next day
    const cursorDate = new Date(cursorMs);
    const h = cursorDate.getUTCHours();
    if (h >= 21 || h < 8) {
      cursorDate.setUTCHours(9, 0, 0, 0);
      if (h >= 21) cursorDate.setUTCDate(cursorDate.getUTCDate() + 1);
      cursorMs = cursorDate.getTime();
    }
  }
  return out;
}
