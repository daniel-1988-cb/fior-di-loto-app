"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, sanitizeString, truncate } from "@/lib/security/validate";

// ============================================
// TYPES
// ============================================

export type Subscription = {
  id: string;
  nome: string;
  descrizione: string | null;
  seduteTotali: number;
  validitaGiorni: number | null;
  prezzo: number;
  serviziInclusi: string[];
  attivo: boolean;
  createdAt: string;
  updatedAt: string;
};

type SubscriptionRow = {
  id: string;
  nome: string;
  descrizione: string | null;
  sedute_totali: number;
  validita_giorni: number | null;
  prezzo: number | string;
  servizi_inclusi: string[] | null;
  attivo: boolean;
  created_at: string;
  updated_at: string;
};

function rowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    nome: row.nome,
    descrizione: row.descrizione,
    seduteTotali: row.sedute_totali,
    validitaGiorni: row.validita_giorni,
    prezzo: typeof row.prezzo === "string" ? Number(row.prezzo) : row.prezzo,
    serviziInclusi: Array.isArray(row.servizi_inclusi) ? row.servizi_inclusi : [],
    attivo: row.attivo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// READ OPERATIONS
// ============================================

export async function getSubscriptions(includeInactive = false): Promise<Subscription[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("subscriptions")
    .select("*")
    .order("nome", { ascending: true });

  if (!includeInactive) {
    query = query.eq("attivo", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => rowToSubscription(row as SubscriptionRow));
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  if (!isValidUUID(id)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToSubscription(data as SubscriptionRow) : null;
}

// ============================================
// WRITE OPERATIONS
// ============================================

type SubscriptionInput = {
  nome?: string;
  descrizione?: string | null;
  seduteTotali?: number;
  validitaGiorni?: number | null;
  prezzo?: number;
  serviziInclusi?: string[];
  attivo?: boolean;
};

function validateServiziInclusi(ids: string[]): string[] {
  return ids.filter((id) => typeof id === "string" && isValidUUID(id)).slice(0, 50);
}

export async function createSubscription(data: SubscriptionInput): Promise<Subscription> {
  if (!data.nome || typeof data.nome !== "string" || data.nome.trim().length === 0) {
    throw new Error("Nome obbligatorio");
  }
  if (
    typeof data.seduteTotali !== "number" ||
    !Number.isInteger(data.seduteTotali) ||
    data.seduteTotali <= 0
  ) {
    throw new Error("Sedute totali deve essere un intero positivo");
  }
  if (typeof data.prezzo !== "number" || data.prezzo < 0) {
    throw new Error("Prezzo non valido");
  }
  if (
    data.validitaGiorni !== undefined &&
    data.validitaGiorni !== null &&
    (!Number.isInteger(data.validitaGiorni) || data.validitaGiorni <= 0)
  ) {
    throw new Error("Validità giorni non valida");
  }

  const nome = truncate(sanitizeString(data.nome), 200);
  const descrizione = data.descrizione
    ? truncate(sanitizeString(data.descrizione), 2000)
    : null;
  const serviziInclusi = data.serviziInclusi
    ? validateServiziInclusi(data.serviziInclusi)
    : [];

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("subscriptions")
    .insert({
      nome,
      descrizione,
      sedute_totali: data.seduteTotali,
      validita_giorni: data.validitaGiorni ?? null,
      prezzo: data.prezzo,
      servizi_inclusi: serviziInclusi,
      attivo: data.attivo ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToSubscription(row as SubscriptionRow);
}

export async function updateSubscription(
  id: string,
  data: SubscriptionInput
): Promise<Subscription> {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  if (
    data.seduteTotali !== undefined &&
    (!Number.isInteger(data.seduteTotali) || data.seduteTotali <= 0)
  ) {
    throw new Error("Sedute totali deve essere un intero positivo");
  }
  if (data.prezzo !== undefined && (typeof data.prezzo !== "number" || data.prezzo < 0)) {
    throw new Error("Prezzo non valido");
  }
  if (
    data.validitaGiorni !== undefined &&
    data.validitaGiorni !== null &&
    (!Number.isInteger(data.validitaGiorni) || data.validitaGiorni <= 0)
  ) {
    throw new Error("Validità giorni non valida");
  }

  const updates: Record<string, unknown> = {};
  if (data.nome !== undefined) {
    if (typeof data.nome !== "string" || data.nome.trim().length === 0) {
      throw new Error("Nome obbligatorio");
    }
    updates.nome = truncate(sanitizeString(data.nome), 200);
  }
  if (data.descrizione !== undefined) {
    updates.descrizione = data.descrizione
      ? truncate(sanitizeString(data.descrizione), 2000)
      : null;
  }
  if (data.seduteTotali !== undefined) updates.sedute_totali = data.seduteTotali;
  if (data.validitaGiorni !== undefined) updates.validita_giorni = data.validitaGiorni;
  if (data.prezzo !== undefined) updates.prezzo = data.prezzo;
  if (data.serviziInclusi !== undefined) {
    updates.servizi_inclusi = validateServiziInclusi(data.serviziInclusi);
  }
  if (data.attivo !== undefined) updates.attivo = data.attivo;
  updates.updated_at = new Date().toISOString();

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return rowToSubscription(row as SubscriptionRow);
}

export async function deleteSubscription(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidUUID(id)) return { ok: false, error: "ID non valido" };

  const supabase = createAdminClient();

  // Soft guard: se esistono transaction_items che referenziano questo
  // abbonamento non permettiamo la cancellazione hard — archiviamo con attivo=false
  const { count } = await supabase
    .from("transaction_items")
    .select("id", { count: "exact", head: true })
    .eq("kind", "abbonamento")
    .eq("ref_id", id);

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from("subscriptions")
      .update({ attivo: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: "archived" };
  }

  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleSubscriptionAttivo(
  id: string,
  attivo: boolean
): Promise<{ ok: boolean }> {
  if (!isValidUUID(id)) return { ok: false };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ attivo, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false };
  return { ok: true };
}
