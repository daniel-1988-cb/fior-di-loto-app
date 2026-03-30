"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeString, truncate } from "@/lib/security/validate";

const VALID_CANALI = ["whatsapp", "email"] as const;
const VALID_CATEGORIE = ["conferma", "promemoria", "offerta", "follow_up", "auguri"] as const;

function isValidCanale(canale: string): boolean {
  return (VALID_CANALI as readonly string[]).includes(canale);
}
function isValidCategoria(cat: string): boolean {
  return (VALID_CATEGORIE as readonly string[]).includes(cat);
}

// ============================================
// READ OPERATIONS
// ============================================

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
  categoria: string;
}) {
  if (!data.nome || typeof data.nome !== "string" || data.nome.trim().length === 0) {
    throw new Error("Nome obbligatorio");
  }
  if (!isValidCanale(data.canale)) throw new Error("Canale non valido");
  if (!data.contenuto || typeof data.contenuto !== "string" || data.contenuto.trim().length === 0) {
    throw new Error("Contenuto obbligatorio");
  }
  if (!isValidCategoria(data.categoria)) throw new Error("Categoria non valida");

  const nome = truncate(sanitizeString(data.nome), 200);
  const contenuto = truncate(sanitizeString(data.contenuto), 5000);

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("message_templates")
    .insert({ nome, canale: data.canale, contenuto, categoria: data.categoria, attivo: true })
    .select()
    .single();

  if (error) throw error;
  return row;
}
