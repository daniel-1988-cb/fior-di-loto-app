"use server";

import { sql } from "@/lib/db";
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

  const startDate = `${safeMonth}-01`;
  const [year, mon] = safeMonth.split("-").map(Number);
  const endDate = new Date(year, mon, 0).toISOString().slice(0, 10);

  return await sql`
    SELECT * FROM social_posts
    WHERE data_pubblicazione >= ${startDate}
      AND data_pubblicazione <= ${endDate}
    ORDER BY data_pubblicazione ASC
  `;
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
  dataPubblicazione: string;
  stato?: string;
  keyword?: string;
}) {
  if (!isValidPiattaforma(data.piattaforma)) throw new Error("Piattaforma non valida");
  if (!isValidTipo(data.tipoContenuto)) throw new Error("Tipo contenuto non valido");
  if (!data.titolo || typeof data.titolo !== "string" || data.titolo.trim().length === 0) {
    throw new Error("Titolo obbligatorio");
  }
  if (!isValidDate(data.dataPubblicazione)) throw new Error("Data pubblicazione non valida");
  const stato = data.stato && isValidStato(data.stato) ? data.stato : "bozza";

  const titolo = truncate(sanitizeString(data.titolo), 300);
  const script = data.script ? truncate(sanitizeString(data.script), 10000) : null;
  const caption = data.caption ? truncate(sanitizeString(data.caption), 2200) : null;
  const keyword = data.keyword ? truncate(sanitizeString(data.keyword), 200) : null;
  const hashtags = data.hashtags
    ? JSON.stringify(data.hashtags.filter((h) => typeof h === "string").map((h) => truncate(sanitizeString(h), 100)).slice(0, 30))
    : JSON.stringify([]);

  const rows = await sql`
    INSERT INTO social_posts (piattaforma, tipo_contenuto, titolo, script, caption, hashtags, data_pubblicazione, stato, keyword)
    VALUES (
      ${data.piattaforma},
      ${data.tipoContenuto},
      ${titolo},
      ${script},
      ${caption},
      ${hashtags}::jsonb,
      ${data.dataPubblicazione},
      ${stato},
      ${keyword}
    )
    RETURNING *
  `;
  return rows[0];
}

export async function updatePostStatus(id: string, stato: string) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  if (!isValidStato(stato)) throw new Error("Stato non valido");

  const rows = await sql`
    UPDATE social_posts
    SET stato = ${stato}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0];
}
