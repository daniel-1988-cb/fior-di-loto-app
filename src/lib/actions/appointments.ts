"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, isValidDate, sanitizeString, truncate } from "@/lib/security/validate";

const VALID_STATI = ["confermato", "completato", "cancellato", "no_show"] as const;

function isValidStato(stato: string): boolean {
  return (VALID_STATI as readonly string[]).includes(stato);
}

// ============================================
// READ OPERATIONS
// ============================================

export async function getAppointments(data?: string) {
  const safeDate = data && isValidDate(data) ? data : new Date().toISOString().slice(0, 10);
  const supabase = createAdminClient();

  const { data: rows, error } = await supabase
    .from("appointments")
    .select("*, clients(nome, cognome, telefono), services(nome, durata, categoria)")
    .eq("data", safeDate)
    .order("ora_inizio", { ascending: true });

  if (error) throw error;
  return rows || [];
}

export async function getUpcomingAppointments() {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];
  const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: rows, error } = await supabase
    .from("appointments")
    .select("*, clients(nome, cognome, telefono), services(nome, durata, categoria)")
    .gte("data", today)
    .lte("data", in7days)
    .order("data", { ascending: true })
    .order("ora_inizio", { ascending: true })
    .limit(100);

  if (error) throw error;
  return rows || [];
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function createAppointment(data: {
  clientId: string;
  serviceId: string;
  data: string;
  oraInizio: string;
  oraFine?: string;
  stato?: string;
  note?: string;
}) {
  if (!isValidUUID(data.clientId)) throw new Error("ID cliente non valido");
  if (!isValidUUID(data.serviceId)) throw new Error("ID servizio non valido");
  if (!isValidDate(data.data)) throw new Error("Data non valida");

  // Validate time format HH:MM
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(data.oraInizio)) throw new Error("Ora inizio non valida");
  if (data.oraFine && !/^\d{2}:\d{2}(:\d{2})?$/.test(data.oraFine)) throw new Error("Ora fine non valida");

  const stato = data.stato && isValidStato(data.stato) ? data.stato : "confermato";
  const note = data.note ? truncate(sanitizeString(data.note), 2000) : null;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("appointments")
    .insert({
      client_id: data.clientId,
      service_id: data.serviceId,
      data: data.data,
      ora_inizio: data.oraInizio,
      ora_fine: data.oraFine || null,
      stato,
      note,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function updateAppointmentStatus(id: string, stato: string) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  if (!isValidStato(stato)) throw new Error("Stato non valido");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("appointments")
    .update({ stato, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return row;
}
