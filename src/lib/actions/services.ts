"use server";

import { sql } from "@/lib/db";
import { isValidUUID, sanitizeString, truncate } from "@/lib/security/validate";

const VALID_CATEGORIE = ["viso", "corpo", "massaggi", "laser", "spa"] as const;

function isValidCategoria(cat: string): boolean {
  return (VALID_CATEGORIE as readonly string[]).includes(cat);
}

// ============================================
// READ OPERATIONS
// ============================================

export async function getServices(categoria?: string) {
  const safeCat = categoria && isValidCategoria(categoria) ? categoria : null;

  if (safeCat) {
    return await sql`
      SELECT * FROM services
      WHERE attivo = true AND categoria = ${safeCat}
      ORDER BY categoria, nome
    `;
  }
  return await sql`
    SELECT * FROM services
    WHERE attivo = true
    ORDER BY categoria, nome
  `;
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
  const descrizione = data.descrizione ? truncate(sanitizeString(data.descrizione), 2000) : null;

  const rows = await sql`
    INSERT INTO services (nome, categoria, descrizione, durata, prezzo, attivo)
    VALUES (${nome}, ${data.categoria}, ${descrizione}, ${data.durata}, ${data.prezzo}, true)
    RETURNING *
  `;
  return rows[0];
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

  const nome = data.nome ? truncate(sanitizeString(data.nome), 200) : null;
  const descrizione = data.descrizione ? truncate(sanitizeString(data.descrizione), 2000) : null;

  const rows = await sql`
    UPDATE services SET
      nome = COALESCE(${nome}, nome),
      categoria = COALESCE(${data.categoria || null}, categoria),
      descrizione = COALESCE(${descrizione}, descrizione),
      durata = COALESCE(${data.durata ?? null}, durata),
      prezzo = COALESCE(${data.prezzo ?? null}, prezzo)
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0];
}

export async function deleteService(id: string) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  const rows = await sql`
    UPDATE services SET attivo = false WHERE id = ${id} RETURNING *
  `;
  return rows[0];
}
