"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/lib/security/validate";

export type StaffTurno = {
  id: string;
  staffId: string;
  data: string; // YYYY-MM-DD
  oraInizio: string; // HH:MM
  oraFine: string; // HH:MM
  note: string | null;
  createdAt: string;
};

type StaffTurnoRow = {
  id: string;
  staff_id: string;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  note: string | null;
  created_at: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

function normalizeTime(t: string): string {
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function rowToTurno(row: StaffTurnoRow): StaffTurno {
  return {
    id: row.id,
    staffId: row.staff_id,
    data: row.data,
    oraInizio: normalizeTime(row.ora_inizio),
    oraFine: normalizeTime(row.ora_fine),
    note: row.note,
    createdAt: row.created_at,
  };
}

// ============================================
// READ
// ============================================

/**
 * Ritorna tutti i turni di una settimana, da weekStartDate (lunedì) incluso a
 * +6 giorni (domenica). Formato data: YYYY-MM-DD.
 */
export async function getTurniByWeek(weekStartDate: string): Promise<StaffTurno[]> {
  if (!DATE_RE.test(weekStartDate)) throw new Error("Data settimana non valida");
  const start = new Date(weekStartDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const endStr = end.toISOString().slice(0, 10);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("staff_turni")
    .select("*")
    .gte("data", weekStartDate)
    .lte("data", endStr)
    .order("data", { ascending: true })
    .order("ora_inizio", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => rowToTurno(r as StaffTurnoRow));
}

export async function getTurniByStaff(
  staffId: string,
  dateFrom: string,
  dateTo: string,
): Promise<StaffTurno[]> {
  if (!isValidUUID(staffId)) throw new Error("ID staff non valido");
  if (!DATE_RE.test(dateFrom) || !DATE_RE.test(dateTo))
    throw new Error("Date non valide");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("staff_turni")
    .select("*")
    .eq("staff_id", staffId)
    .gte("data", dateFrom)
    .lte("data", dateTo)
    .order("data", { ascending: true })
    .order("ora_inizio", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => rowToTurno(r as StaffTurnoRow));
}

// ============================================
// WRITE
// ============================================

export type CreateTurnoInput = {
  staffId: string;
  data: string;
  oraInizio: string;
  oraFine: string;
  note?: string | null;
};

export async function createTurno(input: CreateTurnoInput): Promise<StaffTurno> {
  if (!isValidUUID(input.staffId)) throw new Error("ID staff non valido");
  if (!DATE_RE.test(input.data)) throw new Error("Data non valida");
  if (!TIME_RE.test(input.oraInizio) || !TIME_RE.test(input.oraFine))
    throw new Error("Orari non validi");
  if (input.oraFine <= input.oraInizio)
    throw new Error("Ora fine deve essere dopo ora inizio");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("staff_turni")
    .insert({
      staff_id: input.staffId,
      data: input.data,
      ora_inizio: input.oraInizio,
      ora_fine: input.oraFine,
      note: input.note ? String(input.note).trim().slice(0, 500) : null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToTurno(data as StaffTurnoRow);
}

export type UpdateTurnoInput = {
  data?: string;
  oraInizio?: string;
  oraFine?: string;
  note?: string | null;
};

export async function updateTurno(
  id: string,
  patch: UpdateTurnoInput,
): Promise<StaffTurno> {
  if (!isValidUUID(id)) throw new Error("ID non valido");

  const updates: Record<string, unknown> = {};
  if (patch.data !== undefined) {
    if (!DATE_RE.test(patch.data)) throw new Error("Data non valida");
    updates.data = patch.data;
  }
  if (patch.oraInizio !== undefined) {
    if (!TIME_RE.test(patch.oraInizio)) throw new Error("Ora inizio non valida");
    updates.ora_inizio = patch.oraInizio;
  }
  if (patch.oraFine !== undefined) {
    if (!TIME_RE.test(patch.oraFine)) throw new Error("Ora fine non valida");
    updates.ora_fine = patch.oraFine;
  }
  if (patch.note !== undefined) {
    updates.note = patch.note ? String(patch.note).trim().slice(0, 500) : null;
  }
  if (
    updates.ora_inizio !== undefined &&
    updates.ora_fine !== undefined &&
    String(updates.ora_fine) <= String(updates.ora_inizio)
  ) {
    throw new Error("Ora fine deve essere dopo ora inizio");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("staff_turni")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToTurno(data as StaffTurnoRow);
}

export async function deleteTurno(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!isValidUUID(id)) return { ok: false, error: "ID non valido" };
  const supabase = createAdminClient();
  const { error } = await supabase.from("staff_turni").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================================
// TEMPLATE HELPERS
// ============================================

export type TurnoTemplateEntry = {
  dayOfWeek: number; // 0 = domenica, 1 = lunedì, ..., 6 = sabato
  oraInizio: string;
  oraFine: string;
};

/**
 * Crea turni per uno staff applicando un template settimanale a partire dal
 * lunedì `weekStart` (YYYY-MM-DD). Le entry con dayOfWeek fuori range sono
 * ignorate. Ritorna la lista dei turni effettivamente creati (duplicati
 * sono saltati grazie al UNIQUE staff_id,data,ora_inizio).
 */
export async function bulkCreateTurniFromTemplate(
  staffId: string,
  template: TurnoTemplateEntry[],
  weekStart: string,
): Promise<StaffTurno[]> {
  if (!isValidUUID(staffId)) throw new Error("ID staff non valido");
  if (!DATE_RE.test(weekStart)) throw new Error("Data settimana non valida");
  if (!Array.isArray(template) || template.length === 0) return [];

  const start = new Date(weekStart + "T00:00:00");
  // weekStart deve essere un lunedì — se non lo è, non normalizziamo ma
  // consideriamo l'offset dal lunedì più vicino (dayOfWeek 1).
  const baseDay = start.getDay(); // 0..6 con 0=dom

  const rows = template
    .filter(
      (t) =>
        Number.isInteger(t.dayOfWeek) &&
        t.dayOfWeek >= 0 &&
        t.dayOfWeek <= 6 &&
        TIME_RE.test(t.oraInizio) &&
        TIME_RE.test(t.oraFine) &&
        t.oraFine > t.oraInizio,
    )
    .map((t) => {
      const d = new Date(start);
      // offset in giorni dal weekStart calcolato rispetto al lunedì=1
      const baseMondayShift = baseDay === 0 ? 6 : baseDay - 1;
      const targetShift = t.dayOfWeek === 0 ? 6 : t.dayOfWeek - 1;
      const offset = targetShift - baseMondayShift;
      d.setDate(start.getDate() + offset);
      return {
        staff_id: staffId,
        data: d.toISOString().slice(0, 10),
        ora_inizio: t.oraInizio,
        ora_fine: t.oraFine,
      };
    });

  if (rows.length === 0) return [];

  const supabase = createAdminClient();
  // Upsert-style: inseriamo e tolleriamo conflitti sull'UNIQUE con
  // onConflict="staff_id,data,ora_inizio" ignore-like (usiamo upsert con
  // ignoreDuplicates via onConflict).
  const { data, error } = await supabase
    .from("staff_turni")
    .upsert(rows, {
      onConflict: "staff_id,data,ora_inizio",
      ignoreDuplicates: true,
    })
    .select();
  if (error) throw error;
  return (data || []).map((r) => rowToTurno(r as StaffTurnoRow));
}

/**
 * Clona i turni della settimana precedente a weekStart (lunedì) sulla
 * settimana indicata. Rispetta il vincolo UNIQUE — duplicati ignorati.
 */
export async function cloneTurniFromPreviousWeek(weekStart: string): Promise<number> {
  if (!DATE_RE.test(weekStart)) throw new Error("Data settimana non valida");
  const start = new Date(weekStart + "T00:00:00");
  const prevStart = new Date(start);
  prevStart.setDate(start.getDate() - 7);
  const prevEnd = new Date(prevStart);
  prevEnd.setDate(prevStart.getDate() + 6);

  const prevStartStr = prevStart.toISOString().slice(0, 10);
  const prevEndStr = prevEnd.toISOString().slice(0, 10);

  const supabase = createAdminClient();
  const { data: prev, error: readErr } = await supabase
    .from("staff_turni")
    .select("staff_id, data, ora_inizio, ora_fine, note")
    .gte("data", prevStartStr)
    .lte("data", prevEndStr);
  if (readErr) throw readErr;
  if (!prev || prev.length === 0) return 0;

  const rows = prev.map((r) => {
    const orig = new Date((r.data as string) + "T00:00:00");
    const shifted = new Date(orig);
    shifted.setDate(orig.getDate() + 7);
    return {
      staff_id: r.staff_id,
      data: shifted.toISOString().slice(0, 10),
      ora_inizio: r.ora_inizio,
      ora_fine: r.ora_fine,
      note: r.note,
    };
  });

  const { data: inserted, error: writeErr } = await supabase
    .from("staff_turni")
    .upsert(rows, {
      onConflict: "staff_id,data,ora_inizio",
      ignoreDuplicates: true,
    })
    .select("id");
  if (writeErr) throw writeErr;
  return inserted?.length ?? 0;
}
