"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, isValidDate, sanitizeString, truncate } from "@/lib/security/validate";
import { refundTransactionToWallet } from "@/lib/actions/transaction-items";

const VALID_STATI = ["confermato", "completato", "cancellato", "no_show"] as const;

function isValidStato(stato: string): boolean {
  return (VALID_STATI as readonly string[]).includes(stato);
}

/**
 * Per un appuntamento dato, cerca tutte le transactions a cui era stato
 * linkato un utilizzo wallet e prova a rimborsarle.
 *
 * Non lancia mai: errori del wallet diventano warning loggati. L'annullamento
 * dell'appuntamento NON deve essere bloccato dal refund.
 *
 * Ritorna l'importo totale rimborsato (somma dei refunded > 0). 0 se l'appt
 * non è stato pagato col saldo.
 */
async function refundWalletForAppointment(appointmentId: string): Promise<number> {
  if (!isValidUUID(appointmentId)) return 0;
  const supabase = createAdminClient();

  // Cerca tutti gli utilizzi wallet linkati a questo appuntamento. Tipicamente
  // uno solo, ma teoricamente se la tx è stata "split saldo + saldo" potrebbero
  // essercene di più — gestiamo come array.
  const { data, error } = await supabase
    .from("client_wallet_transactions")
    .select("transaction_id")
    .eq("appointment_id", appointmentId)
    .eq("tipo", "utilizzo");

  if (error) {
    console.warn(`[refund] appt ${appointmentId} wallet lookup failed: ${error.message}`);
    return 0;
  }

  const txIds = Array.from(
    new Set(
      ((data as Array<{ transaction_id: string | null }> | null) || [])
        .map((r) => r.transaction_id)
        .filter((id): id is string => !!id),
    ),
  );

  let totalRefunded = 0;
  for (const txId of txIds) {
    const res = await refundTransactionToWallet(txId);
    if (res.ok) {
      if (res.refunded > 0) {
        console.log(`[refund] tx ${txId} refunded €${res.refunded.toFixed(2)}`);
        totalRefunded += res.refunded;
      }
    } else {
      console.warn(`[refund] tx ${txId} refund failed: ${res.error}`);
    }
  }
  return Math.round(totalRefunded * 100) / 100;
}

// ============================================
// READ OPERATIONS
// ============================================

export async function getAppointment(id: string) {
  if (!isValidUUID(id)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*, clients(id, nome, cognome, telefono), services(id, nome, durata, prezzo, categoria)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAppointments(data?: string) {
  const safeDate = data && isValidDate(data) ? data : new Date().toISOString().slice(0, 10);
  const supabase = createAdminClient();

  const { data: rows, error } = await supabase
    .from("appointments")
    .select("*, clients(nome, cognome, telefono), services(nome, durata, prezzo, categoria), staff(id, nome, colore)")
    .eq("data", safeDate)
    .order("ora_inizio", { ascending: true });

  if (error) throw error;
  return rows || [];
}

export async function getAppointmentsMultiStaff(data: string) {
  const safeDate = isValidDate(data) ? data : new Date().toISOString().slice(0, 10);
  const supabase = createAdminClient();

  const { data: rows, error } = await supabase
    .from("appointments")
    .select("*, clients(nome, cognome, telefono), services(nome, durata, prezzo, categoria), staff(id, nome, colore)")
    .eq("data", safeDate)
    .order("ora_inizio", { ascending: true });

  if (error) throw error;
  return rows || [];
}

export async function getAppointmentsByRange(dateFrom: string, dateTo: string) {
  if (!isValidDate(dateFrom) || !isValidDate(dateTo)) return [];
  const supabase = createAdminClient();

  const { data: rows, error } = await supabase
    .from("appointments")
    .select("data, stato")
    .gte("data", dateFrom)
    .lte("data", dateTo)
    .order("data", { ascending: true });

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
  staffId?: string;
}) {
  if (!isValidUUID(data.clientId)) throw new Error("ID cliente non valido");
  if (!isValidUUID(data.serviceId)) throw new Error("ID servizio non valido");
  if (!isValidDate(data.data)) throw new Error("Data non valida");
  if (data.staffId && !isValidUUID(data.staffId)) throw new Error("ID staff non valido");

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
      staff_id: data.staffId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
}

/**
 * Aggiorna lo stato di un appuntamento.
 *
 * Side-effect: se il nuovo stato è "cancellato", tenta il rimborso automatico
 * al wallet del cliente per ogni transaction collegata che era stata pagata
 * (anche solo parzialmente) col saldo. Errori del refund sono loggati come
 * warning ma NON bloccano l'aggiornamento.
 *
 * Ritorna la riga aggiornata + `refunded` (importo totale rimborsato, 0 se
 * non c'era nulla da rimborsare).
 */
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

  let refunded = 0;
  if (stato === "cancellato") {
    refunded = await refundWalletForAppointment(id);
  }
  return { ...(row as Record<string, unknown>), refunded };
}

/**
 * Elimina definitivamente un appuntamento.
 *
 * Side-effect: prima dell'eliminazione, tenta il refund automatico al wallet
 * per ogni tx pagata col saldo. Lo facciamo PRIMA della delete per leggere
 * i link wallet→appointment (anche se la wallet riga sopravvive in ogni caso
 * grazie a appointment_id senza ON DELETE CASCADE).
 *
 * Ritorna `refunded` (importo totale rimborsato, 0 se nulla).
 */
export async function deleteAppointment(id: string): Promise<{ refunded: number }> {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  const refunded = await refundWalletForAppointment(id);
  const supabase = createAdminClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
  return { refunded };
}

export async function updateAppointment(id: string, data: {
  data?: string;
  oraInizio?: string;
  oraFine?: string;
  stato?: string;
  note?: string;
}) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.data && isValidDate(data.data)) updates.data = data.data;
  if (data.oraInizio && /^\d{2}:\d{2}/.test(data.oraInizio)) updates.ora_inizio = data.oraInizio;
  if (data.oraFine && /^\d{2}:\d{2}/.test(data.oraFine)) updates.ora_fine = data.oraFine;
  if (data.stato && isValidStato(data.stato)) updates.stato = data.stato;
  if (data.note !== undefined) updates.note = data.note ? truncate(sanitizeString(data.note), 2000) : null;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function markAppointmentPaid(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!isValidUUID(id)) return { ok: false, error: "ID non valido" };
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("appointments")
    .update({ pagato_at: now, stato: "completato", updated_at: now })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unmarkAppointmentPaid(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!isValidUUID(id)) return { ok: false, error: "ID non valido" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("appointments")
    .update({ pagato_at: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
