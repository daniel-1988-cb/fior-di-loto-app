"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, sanitizeString, truncate } from "@/lib/security/validate";
import type { ServiceForBot } from "@/lib/types/bot";

const VALID_CATEGORIE = ["viso", "corpo", "massaggi", "laser", "spa"] as const;

function isValidCategoria(cat: string): boolean {
  return (VALID_CATEGORIE as readonly string[]).includes(cat);
}

// ============================================
// READ OPERATIONS
// ============================================

export async function getService(id: string) {
  if (!isValidUUID(id)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getServices(categoria?: string) {
  const supabase = createAdminClient();
  const safeCat = categoria && isValidCategoria(categoria) ? categoria : null;

  let query = supabase
    .from("services")
    .select("*")
    .eq("attivo", true)
    .order("categoria", { ascending: true })
    .order("nome", { ascending: true });

  if (safeCat) {
    query = query.eq("categoria", safeCat);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createService(data: {
  nome: string;
  categoria: string;
  descrizione?: string;
  durata: number;
  prezzo: number;
}) {
  if (!data.nome || typeof data.nome !== "string" || data.nome.trim().length === 0) {
    throw new Error("Nome obbligatorio");
  }
  if (!isValidCategoria(data.categoria)) throw new Error("Categoria non valida");
  if (!Number.isInteger(data.durata) || data.durata <= 0) throw new Error("Durata non valida (deve essere un intero positivo in minuti)");
  if (typeof data.prezzo !== "number" || data.prezzo <= 0) throw new Error("Prezzo non valido");

  const nome = truncate(sanitizeString(data.nome), 200);
  const descrizione = data.descrizione ? truncate(sanitizeString(data.descrizione), 1000) : null;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("services")
    .insert({ nome, categoria: data.categoria, descrizione, durata: data.durata, prezzo: data.prezzo, attivo: true })
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function updateService(id: string, data: {
  nome?: string;
  categoria?: string;
  descrizione?: string;
  durata?: number;
  prezzo?: number;
}) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  if (data.categoria && !isValidCategoria(data.categoria)) throw new Error("Categoria non valida");
  if (data.durata !== undefined && (!Number.isInteger(data.durata) || data.durata <= 0)) throw new Error("Durata non valida");
  if (data.prezzo !== undefined && (typeof data.prezzo !== "number" || data.prezzo <= 0)) throw new Error("Prezzo non valido");

  const updates: Record<string, unknown> = {};
  if (data.nome) updates.nome = truncate(sanitizeString(data.nome), 200);
  if (data.categoria) updates.categoria = data.categoria;
  if (data.descrizione !== undefined) updates.descrizione = data.descrizione ? truncate(sanitizeString(data.descrizione), 1000) : null;
  if (data.durata !== undefined) updates.durata = data.durata;
  if (data.prezzo !== undefined) updates.prezzo = data.prezzo;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("services")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function deleteService(id: string) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("services")
    .update({ attivo: false })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return row;
}

// ============================================
// BOT INTEGRATION
// ============================================

/**
 * Carica i servizi attivi per il bot Marialucia. Il blocco testuale
 * costruito da `buildCatalogBlock` viene iniettato nel systemInstruction
 * di Gemini così il bot può rispondere a domande tipo "quanto costa la
 * pulizia viso?" o "in cosa consiste X?".
 *
 * NB: il tipo `ServiceForBot` è definito in `src/lib/types/bot.ts` —
 * un file `"use server"` non può esportare `type`/`interface`, e
 * `catalog-context.ts` deve poterlo importare senza creare loop.
 */
export async function getServicesForBot(): Promise<ServiceForBot[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("services")
    .select("nome, categoria, durata, prezzo, descrizione")
    .eq("attivo", true)
    .order("categoria", { ascending: true })
    .order("nome", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((s) => ({
    nome: s.nome as string,
    categoria: s.categoria as string,
    durata: Number(s.durata),
    prezzo: typeof s.prezzo === "string" ? Number(s.prezzo) : (s.prezzo as number),
    descrizione: (s.descrizione as string | null) ?? null,
  }));
}
