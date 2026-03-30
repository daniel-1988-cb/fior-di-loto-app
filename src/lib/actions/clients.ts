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
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("clients").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
    supabase.from("transactions").select("importo").eq("tipo", "entrata").gte("data", today.slice(0, 7) + "-01"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("data", today)
      .neq("stato", "cancellato"),
  ]);

  const entrateMese = (entrateRows || []).reduce((sum, r) => sum + Number(r.importo || 0), 0);

  return {
    totaleClienti: totaleClienti ?? 0,
    nuoviMese: nuoviMese ?? 0,
    entrateMese,
    appuntamentiOggi: appuntamentiOggi ?? 0,
  };
}
