"use server";

import { sql } from "@/lib/db";
import { validateClientInput, isValidUUID, isValidSegmento, sanitizeString, truncate } from "@/lib/security/validate";

// ============================================
// READ OPERATIONS (validated inputs)
// ============================================

export async function getClients(segmento?: string, search?: string) {
  // Validate segmento
  const safeSeg = segmento && segmento !== "tutti" && isValidSegmento(segmento) ? segmento : null;
  // Sanitize search — limit length, strip dangerous chars
  const safeSearch = search ? truncate(sanitizeString(search), 100) : null;

  if (safeSeg && safeSearch) {
    return await sql`
      SELECT * FROM clients
      WHERE segmento = ${safeSeg}
      AND (nome ILIKE ${"%" + safeSearch + "%"} OR cognome ILIKE ${"%" + safeSearch + "%"} OR telefono ILIKE ${"%" + safeSearch + "%"} OR email ILIKE ${"%" + safeSearch + "%"})
      ORDER BY updated_at DESC
      LIMIT 200
    `;
  } else if (safeSeg) {
    return await sql`
      SELECT * FROM clients WHERE segmento = ${safeSeg} ORDER BY updated_at DESC LIMIT 200
    `;
  } else if (safeSearch) {
    return await sql`
      SELECT * FROM clients
      WHERE nome ILIKE ${"%" + safeSearch + "%"} OR cognome ILIKE ${"%" + safeSearch + "%"} OR telefono ILIKE ${"%" + safeSearch + "%"} OR email ILIKE ${"%" + safeSearch + "%"}
      ORDER BY updated_at DESC
      LIMIT 200
    `;
  }
  return await sql`SELECT * FROM clients ORDER BY updated_at DESC LIMIT 200`;
}

export async function getClient(id: string) {
  if (!isValidUUID(id)) return null;
  const rows = await sql`SELECT * FROM clients WHERE id = ${id}`;
  return rows[0] || null;
}

export async function getClientInteractions(clientId: string) {
  if (!isValidUUID(clientId)) return [];
  return await sql`
    SELECT * FROM client_interactions
    WHERE client_id = ${clientId}
    ORDER BY created_at DESC
    LIMIT 100
  `;
}

// ============================================
// WRITE OPERATIONS (validated + sanitized)
// ============================================

export async function createClient(data: {
  nome: string;
  cognome: string;
  telefono?: string;
  email?: string;
  dataNascita?: string;
  indirizzo?: string;
  segmento: string;
  fonte?: string;
  note?: string;
  tags?: string[];
}) {
  // Validate all input
  const { valid, errors, sanitized } = validateClientInput(data);
  if (!valid) {
    throw new Error(`Dati non validi: ${errors.join(", ")}`);
  }

  const rows = await sql`
    INSERT INTO clients (nome, cognome, telefono, email, data_nascita, indirizzo, segmento, fonte, note, tags)
    VALUES (
      ${sanitized.nome as string},
      ${sanitized.cognome as string},
      ${(sanitized.telefono as string) || null},
      ${(sanitized.email as string) || null},
      ${(sanitized.dataNascita as string) || null},
      ${(sanitized.indirizzo as string) || null},
      ${(sanitized.segmento as string) || "nuova"},
      ${(sanitized.fonte as string) || null},
      ${(sanitized.note as string) || null},
      ${JSON.stringify(sanitized.tags || [])}
    )
    RETURNING *
  `;
  return rows[0];
}

export async function updateClient(id: string, data: {
  nome?: string;
  cognome?: string;
  telefono?: string;
  email?: string;
  dataNascita?: string;
  indirizzo?: string;
  segmento?: string;
  fonte?: string;
  note?: string;
  tags?: string[];
}) {
  if (!isValidUUID(id)) throw new Error("ID non valido");

  const { valid, errors, sanitized } = validateClientInput({ ...data, nome: data.nome || "temp", cognome: data.cognome || "temp" });
  if (!valid && errors.some(e => !e.includes("obbligatorio"))) {
    throw new Error(`Dati non validi: ${errors.filter(e => !e.includes("obbligatorio")).join(", ")}`);
  }

  const rows = await sql`
    UPDATE clients SET
      nome = COALESCE(${(sanitized.nome as string) !== "temp" ? (sanitized.nome as string) : null}, nome),
      cognome = COALESCE(${(sanitized.cognome as string) !== "temp" ? (sanitized.cognome as string) : null}, cognome),
      telefono = COALESCE(${(sanitized.telefono as string) ?? null}, telefono),
      email = COALESCE(${(sanitized.email as string) ?? null}, email),
      data_nascita = COALESCE(${(sanitized.dataNascita as string) ?? null}, data_nascita),
      indirizzo = COALESCE(${(sanitized.indirizzo as string) ?? null}, indirizzo),
      segmento = COALESCE(${(sanitized.segmento as string) ?? null}, segmento),
      fonte = COALESCE(${(sanitized.fonte as string) ?? null}, fonte),
      note = COALESCE(${(sanitized.note as string) ?? null}, note),
      tags = COALESCE(${sanitized.tags ? JSON.stringify(sanitized.tags) : null}::jsonb, tags),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0];
}

export async function deleteClient(id: string) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  await sql`DELETE FROM clients WHERE id = ${id}`;
}

// ============================================
// DASHBOARD (read-only, no user input)
// ============================================

export async function getDashboardStats() {
  const totalClients = await sql`SELECT COUNT(*) as count FROM clients`;
  const newThisMonth = await sql`
    SELECT COUNT(*) as count FROM clients
    WHERE created_at >= date_trunc('month', CURRENT_DATE)
  `;
  const revenue = await sql`
    SELECT COALESCE(SUM(importo), 0) as total FROM transactions
    WHERE tipo = 'entrata' AND data >= date_trunc('month', CURRENT_DATE)
  `;
  const appointmentsToday = await sql`
    SELECT COUNT(*) as count FROM appointments
    WHERE data = CURRENT_DATE AND stato != 'cancellato'
  `;

  return {
    totaleClienti: Number(totalClients[0].count),
    nuoviMese: Number(newThisMonth[0].count),
    entrateMese: Number(revenue[0].total),
    appuntamentiOggi: Number(appointmentsToday[0].count),
  };
}
