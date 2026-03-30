"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, isValidDate, sanitizeString, truncate } from "@/lib/security/validate";

const VALID_STATI = ["bozza", "programmato", "pubblicato"] as const;
const VALID_PIATTAFORME = ["instagram", "facebook"] as const;
const VALID_TIPI = ["reel_hook", "educational", "prima_dopo", "connessione", "prodotto"] as const;

function isValidStato(stato: string): boolean {
  return (VALID_STATI as readonly string[]).includes(stato);
}
function isValidPiattaforma(p: string): boolean {
  return (VALID_PIATTAFORME as readonly string[]).includes(p);
}
function isValidTipo(t: string): boolean {
  return (VALID_TIPI as readonly string[]).includes(t);
}

// ============================================
// READ OPERATIONS
// ============================================

export async function getSocialPosts(month?: string) {
  let safeMonth = month;
  if (!safeMonth || !/^\d{4}-\d{2}$/.test(safeMonth)) {
    const now = new Date();
    safeMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  const monthStart = `${safeMonth}-01`;
  const [year, mon] = safeMonth.split("-").map(Number);
  const nextMonthDate = new Date(year, mon, 1); // mon is 1-indexed, Date month is 0-indexed so mon = next month
  const nextMonthStart = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("social_posts")
    .select("*")
    .gte("data_pubblicazione", monthStart)
    .lt("data_pubblicazione", nextMonthStart)
    .order("data_pubblicazione", { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createSocialPost(data: {
  piattaforma: string;
  tipoContenuto: string;
  titolo: string;
  script?: string;
  caption?: string;
  hashtags?: string[];
  dataPubblicazione: string | Date;
  stato?: string;
  keyword?: string;
}) {
  if (!isValidPiattaforma(data.piattaforma)) throw new Error("Piattaforma non valida");
  if (!isValidTipo(data.tipoContenuto)) throw new Error("Tipo contenuto non valido");
  if (!data.titolo || typeof data.titolo !== "string" || data.titolo.trim().length === 0) {
    throw new Error("Titolo obbligatorio");
  }

  const dataPubblicazione = data.dataPubblicazione instanceof Date
    ? data.dataPubblicazione.toISOString()
    : data.dataPubblicazione;

  if (!isValidDate(typeof dataPubblicazione === "string" ? dataPubblicazione.split("T")[0] : dataPubblicazione)) {
    throw new Error("Data pubblicazione non valida");
  }

  const stato = data.stato && isValidStato(data.stato) ? data.stato : "bozza";
  const titolo = truncate(sanitizeString(data.titolo), 300);
  const script = data.script ? truncate(sanitizeString(data.script), 10000) : null;
  const caption = data.caption ? truncate(sanitizeString(data.caption), 2200) : null;
  const keyword = data.keyword ? truncate(sanitizeString(data.keyword), 200) : null;
  const hashtags = data.hashtags
    ? data.hashtags.filter((h) => typeof h === "string").map((h) => truncate(sanitizeString(h), 100)).slice(0, 30)
    : [];

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("social_posts")
    .insert({
      piattaforma: data.piattaforma,
      tipo_contenuto: data.tipoContenuto,
      titolo,
      script,
      caption,
      hashtags,
      data_pubblicazione: dataPubblicazione,
      stato,
      keyword,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function updatePostStatus(id: string, stato: string) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  if (!isValidStato(stato)) throw new Error("Stato non valido");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("social_posts")
    .update({ stato, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return row;
}
