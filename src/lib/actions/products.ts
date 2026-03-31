"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, sanitizeString, truncate } from "@/lib/security/validate";

// ============================================
// READ OPERATIONS
// ============================================

export async function getProduct(id: string) {
  if (!isValidUUID(id)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProducts() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("attivo", true)
    .order("categoria", { ascending: true })
    .order("nome", { ascending: true });

  if (error) throw error;
  return (data || []).map((product) => ({
    ...product,
    low_stock: product.giacenza <= (product.soglia_alert ?? 5),
  }));
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createProduct(data: {
  nome: string;
  categoria: string;
  descrizione?: string;
  prezzo: number;
  giacenza: number;
  sogliaAlert?: number;
}) {
  if (!data.nome || typeof data.nome !== "string" || data.nome.trim().length === 0) {
    throw new Error("Nome obbligatorio");
  }
  if (!data.categoria || typeof data.categoria !== "string" || data.categoria.trim().length === 0) {
    throw new Error("Categoria obbligatoria");
  }
  if (typeof data.prezzo !== "number" || data.prezzo < 0) throw new Error("Prezzo non valido");
  if (!Number.isInteger(data.giacenza) || data.giacenza < 0) throw new Error("Giacenza non valida");

  const nome = truncate(sanitizeString(data.nome), 200);
  const categoria = truncate(sanitizeString(data.categoria), 100);
  const descrizione = data.descrizione ? truncate(sanitizeString(data.descrizione), 2000) : null;
  const sogliaAlert = data.sogliaAlert ?? 5;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("products")
    .insert({ nome, categoria, descrizione, prezzo: data.prezzo, giacenza: data.giacenza, soglia_alert: sogliaAlert, attivo: true })
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function updateProduct(id: string, data: {
  nome?: string;
  categoria?: string;
  descrizione?: string;
  prezzo?: number;
  giacenza?: number;
  sogliaAlert?: number;
}) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  if (data.prezzo !== undefined && (typeof data.prezzo !== "number" || data.prezzo < 0)) throw new Error("Prezzo non valido");
  if (data.giacenza !== undefined && (!Number.isInteger(data.giacenza) || data.giacenza < 0)) throw new Error("Giacenza non valida");

  const updates: Record<string, unknown> = {};
  if (data.nome) updates.nome = truncate(sanitizeString(data.nome), 200);
  if (data.categoria) updates.categoria = truncate(sanitizeString(data.categoria), 100);
  if (data.descrizione !== undefined) updates.descrizione = data.descrizione ? truncate(sanitizeString(data.descrizione), 2000) : null;
  if (data.prezzo !== undefined) updates.prezzo = data.prezzo;
  if (data.giacenza !== undefined) updates.giacenza = data.giacenza;
  if (data.sogliaAlert !== undefined) updates.soglia_alert = data.sogliaAlert;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function updateGiacenza(id: string, delta: number) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  if (!Number.isInteger(delta)) throw new Error("Delta non valido");

  const supabase = createAdminClient();

  // Fetch current giacenza
  const { data: current, error: fetchError } = await supabase
    .from("products")
    .select("giacenza")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  const newGiacenza = Math.max(0, (current.giacenza ?? 0) + delta);

  const { data: row, error } = await supabase
    .from("products")
    .update({ giacenza: newGiacenza })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return row;
}
