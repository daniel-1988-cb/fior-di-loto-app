"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeString, truncate, isValidUUID } from "@/lib/security/validate";
import { isAdmin } from "@/lib/actions/ai-assistant";
import { VALID_CHANNELS, type Canale } from "@/lib/constants/messages";

function isValidCanale(canale: string): canale is Canale {
  return (VALID_CHANNELS as readonly string[]).includes(canale);
}

const MAX_NOME = 200;
const MAX_CATEGORIA = 80;
const MAX_CONTENUTO = 4000;

// ============================================
// READ OPERATIONS
// ============================================

// Backward-compatible: returns active whatsapp templates (used by marketing pages indirectly).
export async function getTemplates() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("attivo", true)
    .eq("canale", "whatsapp")
    .order("categoria", { ascending: true });

  if (error) throw error;
  return data || [];
}

// Returns ALL templates across channels — used by the admin CRUD UI.
export async function getAllTemplates() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .order("canale", { ascending: true })
    .order("nome", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getTemplate(id: string) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getClients() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, nome, cognome, telefono, segmento")
    .order("cognome", { ascending: true })
    .limit(500);

  if (error) throw error;
  return data || [];
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createTemplate(data: {
  nome: string;
  canale: string;
  contenuto: string;
  categoria?: string;
  attivo?: boolean;
}) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Accesso negato");

  if (!data.nome || typeof data.nome !== "string" || data.nome.trim().length === 0) {
    throw new Error("Nome obbligatorio");
  }
  if (!isValidCanale(data.canale)) throw new Error("Canale non valido");
  if (!data.contenuto || typeof data.contenuto !== "string" || data.contenuto.trim().length === 0) {
    throw new Error("Contenuto obbligatorio");
  }

  const nome = truncate(sanitizeString(data.nome), MAX_NOME);
  const contenuto = truncate(data.contenuto.trim(), MAX_CONTENUTO);
  const categoria = data.categoria && data.categoria.trim().length > 0
    ? truncate(sanitizeString(data.categoria), MAX_CATEGORIA)
    : null;
  const attivo = data.attivo === undefined ? true : !!data.attivo;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("message_templates")
    .insert({ nome, canale: data.canale, contenuto, categoria, attivo })
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function updateTemplate(
  id: string,
  data: {
    nome?: string;
    canale?: string;
    categoria?: string | null;
    contenuto?: string;
    attivo?: boolean;
  }
) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Accesso negato");
  if (!isValidUUID(id)) throw new Error("ID non valido");

  const patch: Record<string, unknown> = {};

  if (data.nome !== undefined) {
    if (typeof data.nome !== "string" || data.nome.trim().length === 0) {
      throw new Error("Nome non valido");
    }
    patch.nome = truncate(sanitizeString(data.nome), MAX_NOME);
  }
  if (data.canale !== undefined) {
    if (!isValidCanale(data.canale)) throw new Error("Canale non valido");
    patch.canale = data.canale;
  }
  if (data.contenuto !== undefined) {
    if (typeof data.contenuto !== "string" || data.contenuto.trim().length === 0) {
      throw new Error("Contenuto obbligatorio");
    }
    patch.contenuto = truncate(data.contenuto.trim(), MAX_CONTENUTO);
  }
  if (data.categoria !== undefined) {
    if (data.categoria === null || (typeof data.categoria === "string" && data.categoria.trim().length === 0)) {
      patch.categoria = null;
    } else {
      patch.categoria = truncate(sanitizeString(data.categoria), MAX_CATEGORIA);
    }
  }
  if (data.attivo !== undefined) {
    patch.attivo = !!data.attivo;
  }

  if (Object.keys(patch).length === 0) {
    return null;
  }

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("message_templates")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function deleteTemplate(id: string) {
  const admin = await isAdmin();
  if (!admin) throw new Error("Accesso negato");
  if (!isValidUUID(id)) throw new Error("ID non valido");

  const supabase = createAdminClient();
  const { error } = await supabase.from("message_templates").delete().eq("id", id);
  if (error) throw error;
}
