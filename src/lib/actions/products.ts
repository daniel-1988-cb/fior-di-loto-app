"use server";

import { sql } from "@/lib/db";
import { isValidUUID, sanitizeString, truncate } from "@/lib/security/validate";

// ============================================
// READ OPERATIONS
// ============================================

export async function getProducts() {
  const rows = await sql`
    SELECT
      *,
      (giacenza <= soglia_alert) AS low_stock
    FROM products
    WHERE attivo = true
    ORDER BY categoria, nome
  `;
  return rows;
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

  const rows = await sql`
    INSERT INTO products (nome, categoria, descrizione, prezzo, giacenza, soglia_alert, attivo)
    VALUES (${nome}, ${categoria}, ${descrizione}, ${data.prezzo}, ${data.giacenza}, ${sogliaAlert}, true)
    RETURNING *
  `;
  return rows[0];
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

  const nome = data.nome ? truncate(sanitizeString(data.nome), 200) : null;
  const categoria = data.categoria ? truncate(sanitizeString(data.categoria), 100) : null;
  const descrizione = data.descrizione ? truncate(sanitizeString(data.descrizione), 2000) : null;

  const rows = await sql`
    UPDATE products SET
      nome = COALESCE(${nome}, nome),
      categoria = COALESCE(${categoria}, categoria),
      descrizione = COALESCE(${descrizione}, descrizione),
      prezzo = COALESCE(${data.prezzo ?? null}, prezzo),
      giacenza = COALESCE(${data.giacenza ?? null}, giacenza),
      soglia_alert = COALESCE(${data.sogliaAlert ?? null}, soglia_alert)
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0];
}

export async function updateGiacenza(id: string, delta: number) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  if (!Number.isInteger(delta)) throw new Error("Delta non valido");

  const rows = await sql`
    UPDATE products
    SET giacenza = GREATEST(0, giacenza + ${delta})
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0];
}
