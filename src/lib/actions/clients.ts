"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { validateClientInput, isValidUUID, isValidSegmento, sanitizeString, truncate } from "@/lib/security/validate";

// ============================================
// READ OPERATIONS (validated inputs)
// ============================================

export async function getClients(segmento?: string, search?: string) {
  const supabase = createAdminClient();

  // Validate segmento
  const safeSeg = segmento && segmento !== "tutti" && isValidSegmento(segmento) ? segmento : null;
  // Sanitize search — limit length, strip dangerous chars
  const safeSearch = search ? truncate(sanitizeString(search), 100) : null;

  let query = supabase.from("clients").select("*").order("updated_at", { ascending: false }).limit(200);

  if (safeSeg) {
    query = query.eq("segmento", safeSeg);
  }
  if (safeSearch) {
    query = query.or(
      `nome.ilike.%${safeSearch}%,cognome.ilike.%${safeSearch}%,telefono.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getClient(id: string) {
  if (!isValidUUID(id)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getClientInteractions(clientId: string) {
  if (!isValidUUID(clientId)) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_interactions")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

// ============================================
// WRITE OPERATIONS (validated + sanitized)
// ============================================

export async function createClient(data: {
  nome: string;
  cognome: string;
  telefono?: string;
  email?: string;
  dataNascita?: string;
  indirizzo?: string;
  segmento: string;
  fonte?: string;
  note?: string;
  tags?: string[];
}) {
  // Validate all input
  const { valid, errors, sanitized } = validateClientInput(data);
  if (!valid) {
    throw new Error(`Dati non validi: ${errors.join(", ")}`);
  }

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("clients")
    .insert({
      nome: sanitized.nome as string,
      cognome: sanitized.cognome as string,
      telefono: (sanitized.telefono as string) || null,
      email: (sanitized.email as string) || null,
      data_nascita: (sanitized.dataNascita as string) || null,
      indirizzo: (sanitized.indirizzo as string) || null,
      segmento: (sanitized.segmento as string) || "nuova",
      fonte: (sanitized.fonte as string) || null,
      note: (sanitized.note as string) || null,
      tags: sanitized.tags || [],
    })
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function updateClient(id: string, data: {
  nome?: string;
  cognome?: string;
  telefono?: string;
  email?: string;
  dataNascita?: string;
  indirizzo?: string;
  segmento?: string;
  fonte?: string;
  note?: string;
  tags?: string[];
}) {
  if (!isValidUUID(id)) throw new Error("ID non valido");

  const { valid, errors, sanitized } = validateClientInput({ ...data, nome: data.nome || "temp", cognome: data.cognome || "temp" });
  if (!valid && errors.some(e => !e.includes("obbligatorio"))) {
    throw new Error(`Dati non validi: ${errors.filter(e => !e.includes("obbligatorio")).join(", ")}`);
  }

  const updates: Record<string, unknown> = {};
  if (sanitized.nome && sanitized.nome !== "temp") updates.nome = sanitized.nome;
  if (sanitized.cognome && sanitized.cognome !== "temp") updates.cognome = sanitized.cognome;
  if (sanitized.telefono !== undefined) updates.telefono = (sanitized.telefono as string) || null;
  if (sanitized.email !== undefined) updates.email = (sanitized.email as string) || null;
  if (sanitized.dataNascita !== undefined) updates.data_nascita = (sanitized.dataNascita as string) || null;
  if (sanitized.indirizzo !== undefined) updates.indirizzo = (sanitized.indirizzo as string) || null;
  if (sanitized.segmento !== undefined) updates.segmento = (sanitized.segmento as string) || null;
  if (sanitized.fonte !== undefined) updates.fonte = (sanitized.fonte as string) || null;
  if (sanitized.note !== undefined) updates.note = (sanitized.note as string) || null;
  if (sanitized.tags !== undefined) updates.tags = sanitized.tags || [];
  updates.updated_at = new Date().toISOString();

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function deleteClient(id: string) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  const supabase = createAdminClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

// ============================================
// QUICK-ACTION FIELDS (client drawer "Attività" menu)
// All return { ok, error? } so the UI can render inline toasts.
// ============================================

type ActionResult = { ok: true } | { ok: false; error: string };

const AVVISO_MAX = 500;
const ALLERGIE_MAX = 1000;
const PATCH_TEST_MAX = 2000;
const TAG_MAX = 40;
const MAX_TAGS = 30;

/** Coerce the JSONB `tags` column (which may be Json | null) to a string[]. */
function coerceTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.length > 0);
}

function iso() {
  return new Date().toISOString();
}

export async function addClientAvviso(clientId: string, text: string): Promise<ActionResult> {
  if (!isValidUUID(clientId)) return { ok: false, error: "ID cliente non valido" };
  const safe = truncate(sanitizeString(text || ""), AVVISO_MAX).trim();
  if (!safe) return { ok: false, error: "Avviso vuoto" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("clients")
    .update({ avviso_personale: safe, updated_at: iso() })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function clearClientAvviso(clientId: string): Promise<ActionResult> {
  if (!isValidUUID(clientId)) return { ok: false, error: "ID cliente non valido" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("clients")
    .update({ avviso_personale: null, updated_at: iso() })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function addClientAllergia(clientId: string, text: string): Promise<ActionResult> {
  if (!isValidUUID(clientId)) return { ok: false, error: "ID cliente non valido" };
  const safe = truncate(sanitizeString(text || ""), 200).trim();
  if (!safe) return { ok: false, error: "Allergia vuota" };
  const supabase = createAdminClient();
  const { data: current, error: readErr } = await supabase
    .from("clients")
    .select("allergie")
    .eq("id", clientId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  const existing = (current?.allergie as string | null) ?? "";
  // Dedupe (case-insensitive) against the existing semicolon list.
  const known = existing
    .split(/\s*;\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (known.some((k) => k.toLowerCase() === safe.toLowerCase())) {
    return { ok: true }; // already present, no-op
  }
  const next = truncate(existing ? `${existing}; ${safe}` : safe, ALLERGIE_MAX);
  const { error } = await supabase
    .from("clients")
    .update({ allergie: next, updated_at: iso() })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function clearClientAllergie(clientId: string): Promise<ActionResult> {
  if (!isValidUUID(clientId)) return { ok: false, error: "ID cliente non valido" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("clients")
    .update({ allergie: null, updated_at: iso() })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Append a patch-test line. `input` may be either free text (stored under
 * today's date) or a pre-formatted "YYYY-MM-DD: note" string — we normalize
 * either way to one line per test, oldest first, newest last.
 */
export async function addClientPatchTest(clientId: string, input: string): Promise<ActionResult> {
  if (!isValidUUID(clientId)) return { ok: false, error: "ID cliente non valido" };
  const raw = sanitizeString(input || "").trim();
  if (!raw) return { ok: false, error: "Testo patch test vuoto" };
  const isoDate = new Date().toISOString().slice(0, 10);
  // If the user didn't prefix with a date, prepend today.
  const line = /^\d{4}-\d{2}-\d{2}\s*:/.test(raw) ? raw : `${isoDate}: ${raw}`;
  const safeLine = truncate(line, 300);
  const supabase = createAdminClient();
  const { data: current, error: readErr } = await supabase
    .from("clients")
    .select("patch_test")
    .eq("id", clientId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  const existing = (current?.patch_test as string | null) ?? "";
  const next = truncate(existing ? `${existing}\n${safeLine}` : safeLine, PATCH_TEST_MAX);
  const { error } = await supabase
    .from("clients")
    .update({ patch_test: next, updated_at: iso() })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function clearClientPatchTest(clientId: string): Promise<ActionResult> {
  if (!isValidUUID(clientId)) return { ok: false, error: "ID cliente non valido" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("clients")
    .update({ patch_test: null, updated_at: iso() })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function addClientTag(clientId: string, tag: string): Promise<ActionResult> {
  if (!isValidUUID(clientId)) return { ok: false, error: "ID cliente non valido" };
  const safe = truncate(sanitizeString(tag || ""), TAG_MAX).trim();
  if (!safe) return { ok: false, error: "Tag vuoto" };
  const supabase = createAdminClient();
  const { data: current, error: readErr } = await supabase
    .from("clients")
    .select("tags")
    .eq("id", clientId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  const tags = coerceTags(current?.tags);
  if (tags.some((t) => t.toLowerCase() === safe.toLowerCase())) return { ok: true };
  if (tags.length >= MAX_TAGS) return { ok: false, error: `Massimo ${MAX_TAGS} tag` };
  const next = [...tags, safe];
  const { error } = await supabase
    .from("clients")
    .update({ tags: next, updated_at: iso() })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function removeClientTag(clientId: string, tag: string): Promise<ActionResult> {
  if (!isValidUUID(clientId)) return { ok: false, error: "ID cliente non valido" };
  const target = (tag || "").trim().toLowerCase();
  if (!target) return { ok: false, error: "Tag vuoto" };
  const supabase = createAdminClient();
  const { data: current, error: readErr } = await supabase
    .from("clients")
    .select("tags")
    .eq("id", clientId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  const tags = coerceTags(current?.tags);
  const next = tags.filter((t) => t.toLowerCase() !== target);
  const { error } = await supabase
    .from("clients")
    .update({ tags: next, updated_at: iso() })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setClientBlocked(clientId: string, blocked: boolean): Promise<ActionResult> {
  if (!isValidUUID(clientId)) return { ok: false, error: "ID cliente non valido" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("clients")
    .update({ blocked: Boolean(blocked), updated_at: iso() })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================================
// CLIENT INTERACTIONS WRITE
// ============================================

export async function addClientInteraction(clientId: string, data: {
  tipo: string; // visita, messaggio, nota, trattamento, acquisto
  descrizione: string;
  importo?: number;
}) {
  if (!isValidUUID(clientId)) throw new Error("ID cliente non valido");
  const VALID_TIPI = ["visita", "messaggio", "nota", "trattamento", "acquisto"];
  if (!VALID_TIPI.includes(data.tipo)) throw new Error("Tipo non valido");
  if (!data.descrizione?.trim()) throw new Error("Descrizione obbligatoria");

  const supabase = createAdminClient();
  const descrizione = truncate(sanitizeString(data.descrizione), 2000);

  const { data: row, error } = await supabase
    .from("client_interactions")
    .insert({
      client_id: clientId,
      tipo: data.tipo,
      descrizione,
      importo: data.importo || null,
    })
    .select()
    .single();

  if (error) throw error;

  // Update ultima_visita and totale_visite if it's a visit/treatment
  if (data.tipo === "visita" || data.tipo === "trattamento") {
    const { data: client } = await supabase
      .from("clients")
      .select("totale_visite, totale_speso")
      .eq("id", clientId)
      .single();
    if (client) {
      await supabase.from("clients").update({
        ultima_visita: new Date().toISOString(),
        totale_visite: (Number(client.totale_visite) || 0) + 1,
        totale_speso: data.importo
          ? (Number(client.totale_speso) || 0) + data.importo
          : client.totale_speso,
        updated_at: new Date().toISOString(),
      }).eq("id", clientId);
    }
  }

  return row;
}

// ============================================
// DASHBOARD (read-only, no user input)
// ============================================

export async function getDashboardStats() {
  const supabase = createAdminClient();

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const today = new Date().toISOString().split("T")[0];

  const [
    { count: totaleClienti },
    { count: nuoviMese },
    { data: entrateRows },
    { count: appuntamentiOggi },
    { data: birthdayRows },
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("clients").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
    supabase.from("transactions").select("importo").eq("tipo", "entrata").gte("data", today.slice(0, 7) + "-01"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("data", today)
      .neq("stato", "cancellato"),
    supabase
      .from("clients")
      .select("id, nome, cognome, data_nascita")
      .not("data_nascita", "is", null),
  ]);

  const entrateMese = (entrateRows || []).reduce((sum, r) => sum + Number(r.importo || 0), 0);

  // Filter clients with birthdays in the next 7 days (by month/day only)
  const now = new Date();
  const compleanniSettimana: Array<{id: string, nome: string, cognome: string, data_nascita: string}> = [];
  for (const row of (birthdayRows || [])) {
    if (!row.data_nascita) continue;
    const bDate = new Date(row.data_nascita + "T00:00:00");
    for (let offset = 0; offset < 7; offset++) {
      const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      if (bDate.getMonth() === checkDate.getMonth() && bDate.getDate() === checkDate.getDate()) {
        compleanniSettimana.push({
          id: row.id as string,
          nome: row.nome as string,
          cognome: row.cognome as string,
          data_nascita: row.data_nascita as string,
        });
        break;
      }
    }
  }

  return {
    totaleClienti: totaleClienti ?? 0,
    nuoviMese: nuoviMese ?? 0,
    entrateMese,
    appuntamentiOggi: appuntamentiOggi ?? 0,
    compleanniSettimana,
  };
}

export async function getClientAppointments(clientId: string) {
  if (!isValidUUID(clientId)) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, data, ora_inizio, stato, services(nome, prezzo), staff(nome, cognome, colore)")
    .eq("client_id", clientId)
    .order("data", { ascending: false })
    .order("ora_inizio", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}
