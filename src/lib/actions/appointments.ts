"use server";

import { sql } from "@/lib/db";
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

  return await sql`
    SELECT
      a.id,
      a.data,
      a.ora_inizio,
      a.ora_fine,
      a.stato,
      a.note,
      a.created_at,
      c.id AS client_id,
      c.nome AS client_nome,
      c.cognome AS client_cognome,
      c.telefono AS client_telefono,
      s.id AS service_id,
      s.nome AS service_nome,
      s.categoria AS service_categoria,
      s.durata AS service_durata,
      s.prezzo AS service_prezzo
    FROM appointments a
    LEFT JOIN clients c ON a.client_id = c.id
    LEFT JOIN services s ON a.service_id = s.id
    WHERE a.data = ${safeDate}
    ORDER BY a.ora_inizio ASC
  `;
}

export async function getUpcomingAppointments() {
  return await sql`
    SELECT
      a.id,
      a.data,
      a.ora_inizio,
      a.ora_fine,
      a.stato,
      a.note,
      a.created_at,
      c.id AS client_id,
      c.nome AS client_nome,
      c.cognome AS client_cognome,
      c.telefono AS client_telefono,
      s.id AS service_id,
      s.nome AS service_nome,
      s.categoria AS service_categoria,
      s.durata AS service_durata,
      s.prezzo AS service_prezzo
    FROM appointments a
    LEFT JOIN clients c ON a.client_id = c.id
    LEFT JOIN services s ON a.service_id = s.id
    WHERE a.data >= CURRENT_DATE AND a.data <= CURRENT_DATE + INTERVAL '7 days'
    ORDER BY a.data ASC, a.ora_inizio ASC
    LIMIT 100
  `;
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

  const rows = await sql`
    INSERT INTO appointments (client_id, service_id, data, ora_inizio, ora_fine, stato, note)
    VALUES (
      ${data.clientId},
      ${data.serviceId},
      ${data.data},
      ${data.oraInizio},
      ${data.oraFine || null},
      ${stato},
      ${note}
    )
    RETURNING *
  `;
  return rows[0];
}

export async function updateAppointmentStatus(id: string, stato: string) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  if (!isValidStato(stato)) throw new Error("Stato non valido");

  const rows = await sql`
    UPDATE appointments
    SET stato = ${stato}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0];
}
