"use server";

import { createAdminClient } from "@/lib/supabase/admin";
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
  // Next month start for lt filter
  const [year, mon] = safeMonth.split("-").map(Number);
  const nextMonthDate = new Date(year, mon, 1); // mon is 1-indexed, Date month is 0-indexed so mon = next month
  const nextMonthStart = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, clients(nome, cognome)")
    .gte("data", startDate)
    .lt("data", nextMonthStart)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data || [];
}

export async function getFinancialSummary() {
  const supabase = createAdminClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthStart = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: entrateRows, error: e1 }, { data: usciteRows, error: e2 }] = await Promise.all([
    supabase.from("transactions").select("importo").eq("tipo", "entrata").gte("data", startOfMonth).lt("data", nextMonthStart),
    supabase.from("transactions").select("importo").eq("tipo", "uscita").gte("data", startOfMonth).lt("data", nextMonthStart),
  ]);

  if (e1) throw e1;
  if (e2) throw e2;

  const entrate = (entrateRows || []).reduce((sum, r) => sum + Number(r.importo || 0), 0);
  const uscite = (usciteRows || []).reduce((sum, r) => sum + Number(r.importo || 0), 0);
  const profitto = entrate - uscite;
  const obiettivo = 30000;
  const percentuale = Math.min(Math.round((entrate / obiettivo) * 100), 100);

  return { entrate, uscite, profitto, obiettivo, percentuale };
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

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("transactions")
    .insert({
      client_id: data.clientId || null,
      tipo: data.tipo,
      categoria,
      descrizione,
      importo: data.importo,
      metodo_pagamento: data.metodoPagamento || null,
      data: data.data,
    })
    .select()
    .single();

  if (error) throw error;

  // Update client totale_speso if it's an entrata linked to a client
  if (data.tipo === "entrata" && data.clientId) {
    const { data: client, error: fetchError } = await supabase
      .from("clients")
      .select("totale_speso, totale_visite")
      .eq("id", data.clientId)
      .single();

    if (!fetchError && client) {
      await supabase
        .from("clients")
        .update({
          totale_speso: (Number(client.totale_speso) || 0) + data.importo,
          totale_visite: (Number(client.totale_visite) || 0) + 1,
          ultima_visita: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.clientId);
    }
  }

  return row;
}
