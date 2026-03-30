"use server";

import { sql } from "@/lib/db";
import { isValidUUID, isValidDate, sanitizeString, truncate } from "@/lib/security/validate";

const VALID_TIPI = ["entrata", "uscita"] as const;
const VALID_METODI = ["contanti", "carta", "bonifico", "satispay"] as const;

function isValidTipo(tipo: string): boolean {
  return (VALID_TIPI as readonly string[]).includes(tipo);
}
function isValidMetodo(metodo: string): boolean {
  return (VALID_METODI as readonly string[]).includes(metodo);
}

// ============================================
// READ OPERATIONS
// ============================================

export async function getTransactions(month?: string) {
  // month format: YYYY-MM
  let safeMonth = month;
  if (!safeMonth || !/^\d{4}-\d{2}$/.test(safeMonth)) {
    const now = new Date();
    safeMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  const startDate = `${safeMonth}-01`;
  // Calculate end date (last day of month)
  const [year, mon] = safeMonth.split("-").map(Number);
  const endDate = new Date(year, mon, 0).toISOString().slice(0, 10);

  return await sql`
    SELECT
      t.*,
      c.nome AS client_nome,
      c.cognome AS client_cognome
    FROM transactions t
    LEFT JOIN clients c ON t.client_id = c.id
    WHERE t.data >= ${startDate} AND t.data <= ${endDate}
    ORDER BY t.data DESC, t.created_at DESC
    LIMIT 200
  `;
}

export async function getFinancialSummary() {
  const result = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN tipo = 'entrata' THEN importo ELSE 0 END), 0) AS entrate,
      COALESCE(SUM(CASE WHEN tipo = 'uscita' THEN importo ELSE 0 END), 0) AS uscite
    FROM transactions
    WHERE data >= date_trunc('month', CURRENT_DATE)
      AND data < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
  `;

  const entrate = Number(result[0].entrate);
  const uscite = Number(result[0].uscite);
  const profitto = entrate - uscite;
  const obiettivo = 30000;
  const progressoPercentuale = Math.min(100, Math.round((entrate / obiettivo) * 100));

  return { entrate, uscite, profitto, obiettivo, progressoPercentuale };
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createTransaction(data: {
  clientId?: string;
  tipo: string;
  categoria: string;
  descrizione: string;
  importo: number;
  metodoPagamento?: string;
  data: string;
}) {
  if (!isValidTipo(data.tipo)) throw new Error("Tipo non valido");
  if (!data.categoria || typeof data.categoria !== "string" || data.categoria.trim().length === 0) {
    throw new Error("Categoria obbligatoria");
  }
  if (!data.descrizione || typeof data.descrizione !== "string" || data.descrizione.trim().length === 0) {
    throw new Error("Descrizione obbligatoria");
  }
  if (typeof data.importo !== "number" || data.importo <= 0) throw new Error("Importo non valido");
  if (!isValidDate(data.data)) throw new Error("Data non valida");
  if (data.clientId && !isValidUUID(data.clientId)) throw new Error("ID cliente non valido");
  if (data.metodoPagamento && !isValidMetodo(data.metodoPagamento)) throw new Error("Metodo pagamento non valido");

  const categoria = truncate(sanitizeString(data.categoria), 100);
  const descrizione = truncate(sanitizeString(data.descrizione), 500);

  const rows = await sql`
    INSERT INTO transactions (client_id, tipo, categoria, descrizione, importo, metodo_pagamento, data)
    VALUES (
      ${data.clientId || null},
      ${data.tipo},
      ${categoria},
      ${descrizione},
      ${data.importo},
      ${data.metodoPagamento || null},
      ${data.data}
    )
    RETURNING *
  `;

  // Update client totale_speso if it's an entrata linked to a client
  if (data.tipo === "entrata" && data.clientId) {
    await sql`
      UPDATE clients
      SET
        totale_speso = totale_speso + ${data.importo},
        totale_visite = totale_visite + 1,
        ultima_visita = ${data.data},
        updated_at = NOW()
      WHERE id = ${data.clientId}
    `;
  }

  return rows[0];
}
