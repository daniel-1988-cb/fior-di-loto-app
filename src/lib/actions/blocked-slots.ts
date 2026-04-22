"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type BlockedSlotTipo =
 | "personalizza"
 | "formazione"
 | "ferie"
 | "pausa"
 | "altro";

const VALID_TIPI: BlockedSlotTipo[] = [
 "personalizza",
 "formazione",
 "ferie",
 "pausa",
 "altro",
];

export type BlockedSlot = {
 id: string;
 staffId: string | null;
 data: string; // YYYY-MM-DD
 oraInizio: string; // HH:MM
 oraFine: string; // HH:MM
 tipo: BlockedSlotTipo;
 titolo: string | null;
 note: string | null;
 createdAt: string;
 updatedAt: string;
};

const UUID_RE = /^[0-9a-f-]{36}$/i;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeTime(t: string): string {
 return t.length === 5 ? t : t.slice(0, 5);
}

function mapRow(r: Record<string, unknown>): BlockedSlot {
 return {
  id: String(r.id),
  staffId: (r.staff_id as string) ?? null,
  data: String(r.data),
  oraInizio: normalizeTime(String(r.ora_inizio)),
  oraFine: normalizeTime(String(r.ora_fine)),
  tipo: r.tipo as BlockedSlotTipo,
  titolo: (r.titolo as string) ?? null,
  note: (r.note as string) ?? null,
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
 };
}

export async function createBlockedSlot(input: {
 staffId?: string | null;
 data: string;
 oraInizio: string;
 oraFine: string;
 tipo?: BlockedSlotTipo;
 titolo?: string | null;
 note?: string | null;
}): Promise<{ ok: true; slot: BlockedSlot } | { ok: false; error: string }> {
 if (!DATE_RE.test(input.data)) return { ok: false, error: "Data non valida" };
 if (!TIME_RE.test(input.oraInizio))
  return { ok: false, error: "Ora inizio non valida" };
 if (!TIME_RE.test(input.oraFine))
  return { ok: false, error: "Ora fine non valida" };
 if (normalizeTime(input.oraFine) <= normalizeTime(input.oraInizio))
  return { ok: false, error: "Ora fine deve essere dopo ora inizio" };
 if (input.staffId && !UUID_RE.test(input.staffId))
  return { ok: false, error: "ID staff non valido" };
 const tipo = input.tipo && VALID_TIPI.includes(input.tipo) ? input.tipo : "personalizza";
 const titolo = input.titolo?.trim().slice(0, 200) || null;
 const note = input.note?.trim().slice(0, 2000) || null;

 const supabase = createAdminClient();
 const { data, error } = await supabase
  .from("blocked_slots")
  .insert({
   staff_id: input.staffId || null,
   data: input.data,
   ora_inizio: input.oraInizio,
   ora_fine: input.oraFine,
   tipo,
   titolo,
   note,
  })
  .select()
  .single();

 if (error) return { ok: false, error: error.message };
 return { ok: true, slot: mapRow(data as Record<string, unknown>) };
}

export async function getBlockedSlotsByDate(data: string): Promise<BlockedSlot[]> {
 if (!DATE_RE.test(data)) return [];
 const supabase = await createClient();
 const { data: rows } = await supabase
  .from("blocked_slots")
  .select("*")
  .eq("data", data)
  .order("ora_inizio", { ascending: true });
 return (rows ?? []).map(mapRow);
}

export async function getBlockedSlotsByRange(
 dataFrom: string,
 dataTo: string,
): Promise<BlockedSlot[]> {
 if (!DATE_RE.test(dataFrom) || !DATE_RE.test(dataTo)) return [];
 const supabase = await createClient();
 const { data: rows } = await supabase
  .from("blocked_slots")
  .select("*")
  .gte("data", dataFrom)
  .lte("data", dataTo)
  .order("data", { ascending: true })
  .order("ora_inizio", { ascending: true });
 return (rows ?? []).map(mapRow);
}

export async function deleteBlockedSlot(id: string): Promise<{ ok: boolean; error?: string }> {
 if (!UUID_RE.test(id)) return { ok: false, error: "ID non valido" };
 const supabase = await createClient();
 const { error } = await supabase.from("blocked_slots").delete().eq("id", id);
 if (error) return { ok: false, error: error.message };
 return { ok: true };
}
