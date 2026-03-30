"use server";

import { sql } from "@/lib/db";
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
  return await sql`
    SELECT * FROM message_templates
    WHERE attivo = true
    ORDER BY categoria, nome
  `;
}

export async function getClients() {
  return await sql`
    SELECT id, nome, cognome, telefono, segmento
    FROM clients
    ORDER BY nome, cognome
    LIMIT 500
  `;
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

  const rows = await sql`
    INSERT INTO message_templates (nome, canale, contenuto, categoria, attivo)
    VALUES (${nome}, ${data.canale}, ${contenuto}, ${data.categoria}, true)
    RETURNING *
  `;
  return rows[0];
}
