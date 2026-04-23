"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, sanitizeString, truncate } from "@/lib/security/validate";

// ============================================
// TYPES
// ============================================

export type Supplier = {
  id: string;
  nome: string;
  partitaIva: string | null;
  codiceFiscale: string | null;
  email: string | null;
  telefono: string | null;
  indirizzo: string | null;
  referente: string | null;
  note: string | null;
  attivo: boolean;
  createdAt: string;
  updatedAt: string;
};

type SupplierRow = {
  id: string;
  nome: string;
  partita_iva: string | null;
  codice_fiscale: string | null;
  email: string | null;
  telefono: string | null;
  indirizzo: string | null;
  referente: string | null;
  note: string | null;
  attivo: boolean;
  created_at: string;
  updated_at: string;
};

function rowToSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    nome: row.nome,
    partitaIva: row.partita_iva,
    codiceFiscale: row.codice_fiscale,
    email: row.email,
    telefono: row.telefono,
    indirizzo: row.indirizzo,
    referente: row.referente,
    note: row.note,
    attivo: row.attivo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// READ OPERATIONS
// ============================================

export async function getSuppliers(includeInactive = false): Promise<Supplier[]> {
  const supabase = createAdminClient();
  let query = supabase.from("suppliers").select("*").order("nome", { ascending: true });
  if (!includeInactive) query = query.eq("attivo", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((r) => rowToSupplier(r as SupplierRow));
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  if (!isValidUUID(id)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToSupplier(data as SupplierRow) : null;
}

// ============================================
// WRITE OPERATIONS
// ============================================

type SupplierInput = {
  nome?: string;
  partitaIva?: string | null;
  codiceFiscale?: string | null;
  email?: string | null;
  telefono?: string | null;
  indirizzo?: string | null;
  referente?: string | null;
  note?: string | null;
  attivo?: boolean;
};

function cleanStr(v: string | null | undefined, max: number): string | null {
  if (v === null || v === undefined) return null;
  const trimmed = typeof v === "string" ? v.trim() : "";
  if (!trimmed) return null;
  return truncate(sanitizeString(trimmed), max);
}

export async function createSupplier(data: SupplierInput): Promise<Supplier> {
  if (!data.nome || typeof data.nome !== "string" || data.nome.trim().length === 0) {
    throw new Error("Nome obbligatorio");
  }

  const payload = {
    nome: truncate(sanitizeString(data.nome), 200),
    partita_iva: cleanStr(data.partitaIva, 20),
    codice_fiscale: cleanStr(data.codiceFiscale, 20),
    email: cleanStr(data.email, 255),
    telefono: cleanStr(data.telefono, 50),
    indirizzo: cleanStr(data.indirizzo, 500),
    referente: cleanStr(data.referente, 500),
    note: cleanStr(data.note, 2000),
    attivo: data.attivo ?? true,
  };

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("suppliers")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return rowToSupplier(row as SupplierRow);
}

export async function updateSupplier(id: string, data: SupplierInput): Promise<Supplier> {
  if (!isValidUUID(id)) throw new Error("ID non valido");

  const updates: Record<string, unknown> = {};
  if (data.nome !== undefined) {
    if (!data.nome || data.nome.trim().length === 0) throw new Error("Nome obbligatorio");
    updates.nome = truncate(sanitizeString(data.nome), 200);
  }
  if (data.partitaIva !== undefined) updates.partita_iva = cleanStr(data.partitaIva, 20);
  if (data.codiceFiscale !== undefined) updates.codice_fiscale = cleanStr(data.codiceFiscale, 20);
  if (data.email !== undefined) updates.email = cleanStr(data.email, 255);
  if (data.telefono !== undefined) updates.telefono = cleanStr(data.telefono, 50);
  if (data.indirizzo !== undefined) updates.indirizzo = cleanStr(data.indirizzo, 500);
  if (data.referente !== undefined) updates.referente = cleanStr(data.referente, 500);
  if (data.note !== undefined) updates.note = cleanStr(data.note, 2000);
  if (data.attivo !== undefined) updates.attivo = data.attivo;
  updates.updated_at = new Date().toISOString();

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("suppliers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToSupplier(row as SupplierRow);
}

export async function deleteSupplier(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidUUID(id)) return { ok: false, error: "ID non valido" };

  const supabase = createAdminClient();
  // Se esistono ordini per questo fornitore archiviamo (attivo=false) invece
  // di hard-delete, per preservare lo storico.
  const { count } = await supabase
    .from("purchase_orders")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", id);

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from("suppliers")
      .update({ attivo: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: "archived" };
  }

  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleSupplierAttivo(
  id: string,
  attivo: boolean
): Promise<{ ok: boolean }> {
  if (!isValidUUID(id)) return { ok: false };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("suppliers")
    .update({ attivo, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false };
  return { ok: true };
}
