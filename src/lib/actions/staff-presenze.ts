"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/lib/security/validate";

export type StaffPresenza = {
  id: string;
  staffId: string;
  data: string; // YYYY-MM-DD
  clockIn: string; // ISO
  clockOut: string | null; // ISO o null se ancora in servizio
  note: string | null;
  createdAt: string;
};

type StaffPresenzaRow = {
  id: string;
  staff_id: string;
  data: string;
  clock_in: string;
  clock_out: string | null;
  note: string | null;
  created_at: string;
};

function rowToPresenza(row: StaffPresenzaRow): StaffPresenza {
  return {
    id: row.id,
    staffId: row.staff_id,
    data: row.data,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    note: row.note,
    createdAt: row.created_at,
  };
}

function todayRome(): string {
  // Usa il timezone server (UTC su Vercel), fallback accettabile per MVP.
  // In caso servisse timezone Rome, calcolare con Intl.DateTimeFormat.
  return new Date().toISOString().slice(0, 10);
}

// ============================================
// CLOCK IN / OUT
// ============================================

/**
 * Crea una riga `clock_in = NOW(), clock_out = NULL, data = today`.
 * Se esiste già una sessione aperta per lo staff, la ritorna senza crearne
 * una nuova (idempotente).
 */
export async function clockIn(staffId: string): Promise<StaffPresenza> {
  if (!isValidUUID(staffId)) throw new Error("ID staff non valido");
  const supabase = createAdminClient();

  const existing = await getCurrentPresenza(staffId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("staff_presenze")
    .insert({
      staff_id: staffId,
      data: todayRome(),
    })
    .select()
    .single();
  if (error) throw error;
  return rowToPresenza(data as StaffPresenzaRow);
}

/**
 * Chiude la sessione aperta più recente dello staff impostando clock_out=NOW().
 * Se non esiste sessione aperta ritorna null (no-op).
 */
export async function clockOut(staffId: string): Promise<StaffPresenza | null> {
  if (!isValidUUID(staffId)) throw new Error("ID staff non valido");
  const supabase = createAdminClient();

  const open = await getCurrentPresenza(staffId);
  if (!open) return null;

  const { data, error } = await supabase
    .from("staff_presenze")
    .update({ clock_out: new Date().toISOString() })
    .eq("id", open.id)
    .select()
    .single();
  if (error) throw error;
  return rowToPresenza(data as StaffPresenzaRow);
}

/**
 * Ritorna la presenza aperta (clock_out IS NULL) per lo staff, oppure null.
 * Se ci sono più righe aperte (non dovrebbe succedere), ritorna la più recente.
 */
export async function getCurrentPresenza(
  staffId: string,
): Promise<StaffPresenza | null> {
  if (!isValidUUID(staffId)) throw new Error("ID staff non valido");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("staff_presenze")
    .select("*")
    .eq("staff_id", staffId)
    .is("clock_out", null)
    .order("clock_in", { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return rowToPresenza(data[0] as StaffPresenzaRow);
}

// ============================================
// MONTHLY SUMMARY
// ============================================

export type MonthlySummary = {
  staffId: string;
  presenze: StaffPresenza[];
  oreTotali: number;
  giorniLavorati: number;
  mediaOreGiorno: number;
};

/**
 * Ritorna tutte le presenze di uno staff per il mese, più ore totali
 * (somma clock_out - clock_in), giorni lavorati distinti e media.
 * Le sessioni aperte (clock_out=null) sono incluse ma contano 0 ore fino a
 * chiusura.
 */
export async function getPresenzeByStaffMonth(
  staffId: string,
  year: number,
  month: number, // 1..12
): Promise<MonthlySummary> {
  if (!isValidUUID(staffId)) throw new Error("ID staff non valido");
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    throw new Error("Anno non valido");
  if (!Number.isInteger(month) || month < 1 || month > 12)
    throw new Error("Mese non valido");

  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("staff_presenze")
    .select("*")
    .eq("staff_id", staffId)
    .gte("data", start)
    .lte("data", end)
    .order("clock_in", { ascending: true });
  if (error) throw error;

  const presenze = (data || []).map((r) => rowToPresenza(r as StaffPresenzaRow));

  let oreTotali = 0;
  const giorniSet = new Set<string>();
  for (const p of presenze) {
    if (p.clockOut) {
      const ms = new Date(p.clockOut).getTime() - new Date(p.clockIn).getTime();
      if (ms > 0) oreTotali += ms / (1000 * 60 * 60);
    }
    giorniSet.add(p.data);
  }
  const giorniLavorati = giorniSet.size;
  const mediaOreGiorno = giorniLavorati > 0 ? oreTotali / giorniLavorati : 0;

  return {
    staffId,
    presenze,
    oreTotali: Math.round(oreTotali * 100) / 100,
    giorniLavorati,
    mediaOreGiorno: Math.round(mediaOreGiorno * 100) / 100,
  };
}

/**
 * Convenienza: summary per tutti gli staff attivi, un mese.
 */
export async function getPresenzeMonthAll(
  year: number,
  month: number,
  staffIds: string[],
): Promise<MonthlySummary[]> {
  const results = await Promise.all(
    staffIds
      .filter((id) => isValidUUID(id))
      .map((id) => getPresenzeByStaffMonth(id, year, month)),
  );
  return results;
}
