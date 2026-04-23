"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/lib/security/validate";

// NB: alcune funzioni base (getStaffFerie, createFerie legacy, deleteFerie)
// esistono già in `staff.ts`. Qui aggiungiamo il workflow approvazione
// introdotto dalla migration 20260423000021 (colonna `stato`).

export type FerieStato = "pending" | "approved" | "rejected";

export type FerieRichiesta = {
  id: string;
  staffId: string;
  dataInizio: string;
  dataFine: string;
  tipo: string;
  stato: FerieStato;
  note: string | null;
  createdAt: string;
};

type FerieRow = {
  id: string;
  staff_id: string;
  data_inizio: string;
  data_fine: string;
  tipo: string;
  stato: string | null;
  note: string | null;
  created_at: string;
};

const VALID_TIPI = ["ferie", "permesso", "malattia", "altro"] as const;
const VALID_STATI: readonly FerieStato[] = ["pending", "approved", "rejected"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function rowToRichiesta(row: FerieRow): FerieRichiesta {
  const stato = (row.stato ?? "pending") as FerieStato;
  return {
    id: row.id,
    staffId: row.staff_id,
    dataInizio: row.data_inizio,
    dataFine: row.data_fine,
    tipo: row.tipo,
    stato: VALID_STATI.includes(stato) ? stato : "pending",
    note: row.note,
    createdAt: row.created_at,
  };
}

// ============================================
// READ
// ============================================

export async function getFerieRichieste(
  statoFilter?: FerieStato | "all",
): Promise<FerieRichiesta[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("staff_ferie")
    .select("*")
    .order("data_inizio", { ascending: false });

  if (statoFilter && statoFilter !== "all") {
    query = query.eq("stato", statoFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((r) => rowToRichiesta(r as FerieRow));
}

// ============================================
// WRITE
// ============================================

export type CreateFerieInput = {
  staffId: string;
  dataInizio: string;
  dataFine: string;
  tipo: string;
  note?: string | null;
};

export async function createRichiestaFerie(
  input: CreateFerieInput,
): Promise<FerieRichiesta> {
  if (!isValidUUID(input.staffId)) throw new Error("ID staff non valido");
  if (!DATE_RE.test(input.dataInizio)) throw new Error("Data inizio non valida");
  if (!DATE_RE.test(input.dataFine)) throw new Error("Data fine non valida");
  if (input.dataFine < input.dataInizio)
    throw new Error("Data fine precedente a data inizio");
  if (!(VALID_TIPI as readonly string[]).includes(input.tipo))
    throw new Error("Tipo non valido");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("staff_ferie")
    .insert({
      staff_id: input.staffId,
      data_inizio: input.dataInizio,
      data_fine: input.dataFine,
      tipo: input.tipo,
      stato: "pending",
      note: input.note ? String(input.note).trim().slice(0, 500) : null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToRichiesta(data as FerieRow);
}

export async function approveFerie(id: string): Promise<FerieRichiesta> {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("staff_ferie")
    .update({ stato: "approved" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToRichiesta(data as FerieRow);
}

export async function rejectFerie(id: string): Promise<FerieRichiesta> {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("staff_ferie")
    .update({ stato: "rejected" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToRichiesta(data as FerieRow);
}

// ============================================
// CONFLICT DETECTION
// ============================================

/**
 * Ritorna gli appuntamenti dello staff che cadono nel range (potenzialmente
 * da riassegnare se la ferie viene approvata).
 */
export async function getAppointmentsInRange(
  staffId: string,
  dataInizio: string,
  dataFine: string,
): Promise<
  Array<{ id: string; data: string; oraInizio: string; clientNome: string | null }>
> {
  if (!isValidUUID(staffId)) throw new Error("ID staff non valido");
  if (!DATE_RE.test(dataInizio) || !DATE_RE.test(dataFine))
    throw new Error("Date non valide");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, data, ora_inizio, clients(nome, cognome)")
    .eq("staff_id", staffId)
    .gte("data", dataInizio)
    .lte("data", dataFine)
    .neq("stato", "cancellato")
    .order("data", { ascending: true });
  if (error) throw error;

  type ApptRow = {
    id: string;
    data: string;
    ora_inizio: string;
    clients: { nome?: string; cognome?: string } | Array<{ nome?: string; cognome?: string }> | null;
  };

  return ((data as unknown as ApptRow[]) || []).map((r) => {
    // Supabase ritorna `clients` come array quando la relazione è many-to-one
    // o come singolo oggetto a seconda della configurazione. Gestiamo entrambi.
    const cRaw = r.clients;
    const client = Array.isArray(cRaw) ? cRaw[0] ?? null : cRaw;
    const clientNome = client
      ? `${client.nome ?? ""} ${client.cognome ?? ""}`.trim() || null
      : null;
    return {
      id: String(r.id),
      data: String(r.data),
      oraInizio: String(r.ora_inizio).slice(0, 5),
      clientNome,
    };
  });
}
