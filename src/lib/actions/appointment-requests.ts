"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AppointmentRequestStato = "pending_review" | "scheduled" | "rejected" | "approved";

export type AppointmentRequestTipo = "nuovo" | "spostamento" | "cancellazione";

export type AppointmentRequestListItem = {
 id: string;
 clientId: string;
 clientName: string;
 clientPhone: string | null;
 testoRichiesta: string;
 stato: AppointmentRequestStato;
 tipo: AppointmentRequestTipo;
 noteOperatore: string | null;
 appointmentId: string | null;
 appointmentIdRef: string | null;
 proposedDateTime: string | null;
 proposedAlternatives: string[];
 createdAt: string;
 processedAt: string | null;
 // Snapshot dell'appuntamento referenziato (solo per spostamento/cancellazione).
 // Joinato a runtime per la UI.
 referencedAppointment?: {
  id: string;
  data: string;
  oraInizio: string;
  oraFine: string | null;
  serviceName: string | null;
  staffName: string | null;
  staffId: string | null;
 } | null;
};

const UUID_RE = /^[0-9a-f-]{36}$/i;
const VALID_TIPI: AppointmentRequestTipo[] = ["nuovo", "spostamento", "cancellazione"];

function isValidTipo(t: string | undefined): t is AppointmentRequestTipo {
 return !!t && (VALID_TIPI as string[]).includes(t);
}

/**
 * Lista richieste pending (default) con join opzionale dell'appuntamento
 * referenziato — necessario alla UI per mostrare "data attuale → orario
 * proposto" sui card di SPOSTAMENTO.
 */
export async function getAppointmentRequests(filters?: {
 stato?: AppointmentRequestStato;
 tipo?: AppointmentRequestTipo;
}): Promise<AppointmentRequestListItem[]> {
 const supabase = await createClient();
 let q = supabase
  .from("appointment_requests")
  .select(
   "id, client_id, testo_richiesta, stato, tipo, note_operatore, appointment_id, appointment_id_ref, proposed_datetime, proposed_alternatives, created_at, processed_at",
  )
  .order("created_at", { ascending: false })
  .limit(200);
 if (filters?.stato) q = q.eq("stato", filters.stato);
 if (filters?.tipo) q = q.eq("tipo", filters.tipo);
 const { data: rows } = await q;
 if (!rows || rows.length === 0) return [];

 const clientIds = Array.from(new Set(rows.map((r) => r.client_id as string)));
 const { data: clients } = await supabase
  .from("clients")
  .select("id, nome, cognome, telefono")
  .in("id", clientIds);
 const byId = new Map((clients ?? []).map((c) => [c.id as string, c]));

 // Join appuntamenti referenziati. Usiamo admin per leggere services+staff
 // anche da contesti che hanno solo session anon (la pagina è già protetta
 // dal layout dashboard).
 const refIds = rows
  .map((r) => r.appointment_id_ref as string | null)
  .filter((x): x is string => !!x);
 type ApptJoin = {
  id: string;
  data: string;
  ora_inizio: string;
  ora_fine: string | null;
  service_id: string | null;
  staff_id: string | null;
  services: { nome: string | null } | null;
  staff: { id: string | null; nome: string | null } | null;
 };
 let apptById = new Map<string, ApptJoin>();
 if (refIds.length > 0) {
  const adm = createAdminClient();
  const { data: appts } = await adm
   .from("appointments")
   .select(
    "id, data, ora_inizio, ora_fine, service_id, staff_id, services(nome), staff(id, nome)",
   )
   .in("id", refIds);
  // Supabase tipa le FK come array anche su relazioni 1:1 (services!fk_*).
  // Normalizziamo qui prendendo il primo elemento se è un array.
  const normalized = (appts ?? []).map((a) => {
   const rec = a as Record<string, unknown>;
   const svcRaw = rec.services;
   const stfRaw = rec.staff;
   const services = Array.isArray(svcRaw)
    ? (svcRaw[0] as { nome: string | null } | null) ?? null
    : (svcRaw as { nome: string | null } | null) ?? null;
   const staff = Array.isArray(stfRaw)
    ? (stfRaw[0] as { id: string | null; nome: string | null } | null) ?? null
    : (stfRaw as { id: string | null; nome: string | null } | null) ?? null;
   return {
    id: rec.id as string,
    data: rec.data as string,
    ora_inizio: rec.ora_inizio as string,
    ora_fine: (rec.ora_fine as string | null) ?? null,
    service_id: (rec.service_id as string | null) ?? null,
    staff_id: (rec.staff_id as string | null) ?? null,
    services,
    staff,
   } satisfies ApptJoin;
  });
  apptById = new Map(normalized.map((a) => [a.id, a]));
 }

 return rows.map((r) => {
  const c = byId.get(r.client_id as string);
  const ref = r.appointment_id_ref
   ? apptById.get(r.appointment_id_ref as string) ?? null
   : null;
  const referencedAppointment = ref
   ? {
      id: ref.id,
      data: ref.data,
      oraInizio: String(ref.ora_inizio).slice(0, 5),
      oraFine: ref.ora_fine ? String(ref.ora_fine).slice(0, 5) : null,
      serviceName: ref.services?.nome ?? null,
      staffName: ref.staff?.nome ?? null,
      staffId: ref.staff?.id ?? null,
     }
   : null;
  // proposed_alternatives è jsonb (default '[]'). Forziamo string[].
  const altsRaw = r.proposed_alternatives;
  const alts = Array.isArray(altsRaw)
   ? (altsRaw as unknown[]).filter((x): x is string => typeof x === "string")
   : [];
  const tipoVal = isValidTipo(r.tipo as string) ? (r.tipo as AppointmentRequestTipo) : "nuovo";
  return {
   id: r.id as string,
   clientId: r.client_id as string,
   clientName: c
    ? `${c.nome ?? ""} ${c.cognome ?? ""}`.trim() || "Sconosciuto"
    : "Sconosciuto",
   clientPhone: (c?.telefono as string) ?? null,
   testoRichiesta: r.testo_richiesta as string,
   stato: r.stato as AppointmentRequestStato,
   tipo: tipoVal,
   noteOperatore: (r.note_operatore as string) ?? null,
   appointmentId: (r.appointment_id as string) ?? null,
   appointmentIdRef: (r.appointment_id_ref as string) ?? null,
   proposedDateTime: (r.proposed_datetime as string) ?? null,
   proposedAlternatives: alts,
   createdAt: r.created_at as string,
   processedAt: (r.processed_at as string) ?? null,
   referencedAppointment,
  };
 });
}

/** Conta le pending di TUTTI i tipi (nuovo + spostamento + cancellazione)
 *  per il badge in sidebar. */
export async function getPendingAppointmentRequestsCount(): Promise<number> {
 const supabase = await createClient();
 const { count } = await supabase
  .from("appointment_requests")
  .select("id", { count: "exact", head: true })
  .eq("stato", "pending_review");
 return count ?? 0;
}

/** Conteggi separati per tipo, usati dai badge sui tab. */
export async function getPendingAppointmentRequestsCountByTipo(): Promise<{
 nuovo: number;
 spostamento: number;
 cancellazione: number;
 total: number;
}> {
 const supabase = await createClient();
 const { data } = await supabase
  .from("appointment_requests")
  .select("tipo")
  .eq("stato", "pending_review")
  .limit(500);
 const out = { nuovo: 0, spostamento: 0, cancellazione: 0, total: 0 };
 for (const r of data ?? []) {
  out.total += 1;
  const t = (r.tipo as string) ?? "nuovo";
  if (t === "spostamento") out.spostamento += 1;
  else if (t === "cancellazione") out.cancellazione += 1;
  else out.nuovo += 1;
 }
 return out;
}

export async function updateAppointmentRequestStatus(
 id: string,
 stato: AppointmentRequestStato,
 opts?: { appointmentId?: string | null; noteOperatore?: string | null },
): Promise<{ ok: boolean; error?: string }> {
 if (!UUID_RE.test(id)) return { ok: false, error: "id non valido" };
 const supabase = await createClient();
 const updates: Record<string, unknown> = {
  stato,
  processed_at: stato === "pending_review" ? null : new Date().toISOString(),
 };
 if (opts?.appointmentId !== undefined) updates.appointment_id = opts.appointmentId;
 if (opts?.noteOperatore !== undefined) updates.note_operatore = opts.noteOperatore;
 const { error } = await supabase.from("appointment_requests").update(updates).eq("id", id);
 if (error) return { ok: false, error: error.message };
 return { ok: true };
}

/**
 * Conferma uno SPOSTAMENTO: aggiorna l'appuntamento referenziato con la nuova
 * data/ora_inizio (e ricalcola ora_fine in base alla durata del servizio),
 * marca la richiesta come `approved`, e invia un WA hardcoded di conferma
 * al cliente (tramite Meta Cloud API).
 *
 * Lo `chosenDateTime` è ISO. Se manca, usa `proposed_datetime` salvato sulla
 * richiesta. Se anche quello manca, ritorna errore (richiede input umano).
 */
export async function confirmRescheduleRequest(
 requestId: string,
 chosenDateTime?: string,
): Promise<{ ok: boolean; error?: string }> {
 if (!UUID_RE.test(requestId)) return { ok: false, error: "id non valido" };
 const adm = createAdminClient();

 const { data: req, error: reqErr } = await adm
  .from("appointment_requests")
  .select(
   "id, client_id, tipo, stato, appointment_id_ref, proposed_datetime",
  )
  .eq("id", requestId)
  .maybeSingle();
 if (reqErr || !req) return { ok: false, error: reqErr?.message ?? "richiesta non trovata" };
 if (req.tipo !== "spostamento") {
  return { ok: false, error: "la richiesta non è uno spostamento" };
 }
 if (!req.appointment_id_ref) {
  return { ok: false, error: "appuntamento di riferimento mancante" };
 }
 const targetIso = chosenDateTime ?? (req.proposed_datetime as string | null);
 if (!targetIso) {
  return { ok: false, error: "datetime non specificato" };
 }
 const target = new Date(targetIso);
 if (isNaN(target.getTime())) {
  return { ok: false, error: "datetime non valido" };
 }

 // Carica appt + service per la durata
 const { data: appt, error: apptErr } = await adm
  .from("appointments")
  .select("id, service_id, ora_inizio, ora_fine, services(durata)")
  .eq("id", req.appointment_id_ref)
  .maybeSingle();
 if (apptErr || !appt) {
  return { ok: false, error: apptErr?.message ?? "appuntamento non trovato" };
 }
 const dur =
  (appt.services as { durata?: number } | null)?.durata ??
  // fallback: differenza ora_fine - ora_inizio in minuti
  (() => {
   const s = String(appt.ora_inizio).slice(0, 5).split(":").map(Number);
   const e = (appt.ora_fine ? String(appt.ora_fine).slice(0, 5).split(":").map(Number) : null);
   if (!s || s.length < 2 || !e || e.length < 2) return 60;
   return e[0] * 60 + e[1] - (s[0] * 60 + s[1]);
  })();

 const newDate = target.toISOString().slice(0, 10);
 const newStart = target.toISOString().slice(11, 16);
 const newEnd = (() => {
  const m = target.getTime() + dur * 60_000;
  const e = new Date(m);
  return e.toISOString().slice(11, 16);
 })();

 // 1) update appointments
 const { error: updApptErr } = await adm
  .from("appointments")
  .update({
   data: newDate,
   ora_inizio: newStart,
   ora_fine: newEnd,
   updated_at: new Date().toISOString(),
  })
  .eq("id", appt.id);
 if (updApptErr) return { ok: false, error: updApptErr.message };

 // 2) marca request approved
 const { error: updReqErr } = await adm
  .from("appointment_requests")
  .update({
   stato: "approved",
   appointment_id: appt.id,
   processed_at: new Date().toISOString(),
  })
  .eq("id", req.id);
 if (updReqErr) return { ok: false, error: updReqErr.message };

 // 3) WA conferma cliente — best-effort, non blocca
 await sendWhatsAppConfirmation(req.client_id as string, {
  kind: "reschedule",
  data: newDate,
  oraInizio: newStart,
 });

 return { ok: true };
}

/**
 * Conferma una CANCELLAZIONE: setta `appointments.stato='cancellato'`,
 * marca la richiesta come `approved`, manda WA al cliente.
 *
 * Riusa `updateAppointmentStatus` indirettamente via update diretto qui per
 * non importare la chain refund (cancellato side-effect). NB: il refund auto
 * non gira qui perché lo script confirm è invocato dal triage UI dove Laura
 * decide caso per caso.
 */
export async function confirmCancellationRequest(
 requestId: string,
): Promise<{ ok: boolean; error?: string }> {
 if (!UUID_RE.test(requestId)) return { ok: false, error: "id non valido" };
 const adm = createAdminClient();

 const { data: req, error: reqErr } = await adm
  .from("appointment_requests")
  .select("id, client_id, tipo, appointment_id_ref")
  .eq("id", requestId)
  .maybeSingle();
 if (reqErr || !req) return { ok: false, error: reqErr?.message ?? "richiesta non trovata" };
 if (req.tipo !== "cancellazione") {
  return { ok: false, error: "la richiesta non è una cancellazione" };
 }
 if (!req.appointment_id_ref) {
  return { ok: false, error: "appuntamento di riferimento mancante" };
 }

 const { data: appt, error: apptErr } = await adm
  .from("appointments")
  .select("id, data, ora_inizio")
  .eq("id", req.appointment_id_ref)
  .maybeSingle();
 if (apptErr || !appt) return { ok: false, error: apptErr?.message ?? "appuntamento non trovato" };

 const { error: cancelErr } = await adm
  .from("appointments")
  .update({ stato: "cancellato", updated_at: new Date().toISOString() })
  .eq("id", appt.id);
 if (cancelErr) return { ok: false, error: cancelErr.message };

 const { error: updReqErr } = await adm
  .from("appointment_requests")
  .update({
   stato: "approved",
   appointment_id: appt.id,
   processed_at: new Date().toISOString(),
  })
  .eq("id", req.id);
 if (updReqErr) return { ok: false, error: updReqErr.message };

 await sendWhatsAppConfirmation(req.client_id as string, {
  kind: "cancel",
  data: appt.data as string,
  oraInizio: String(appt.ora_inizio).slice(0, 5),
 });

 return { ok: true };
}

/**
 * Helper: invia WA hardcoded di conferma al cliente referenziato dalla
 * richiesta. Logga la riga in `wa_conversations` come role=assistant per
 * mantenere lo storico del thread.
 *
 * Best-effort: errori loggati ma non rilanciati. La conferma DB è già
 * avvenuta, peggio che peggio Laura manda il messaggio a mano dopo.
 */
async function sendWhatsAppConfirmation(
 clientId: string,
 ctx:
  | { kind: "reschedule"; data: string; oraInizio: string }
  | { kind: "cancel"; data: string; oraInizio: string },
): Promise<void> {
 try {
  const adm = createAdminClient();
  const { data: client } = await adm
   .from("clients")
   .select("telefono")
   .eq("id", clientId)
   .maybeSingle();
  const tel = client?.telefono ? String(client.telefono).replace(/^\+/, "") : null;
  if (!tel) return;

  const dataLabel = formatDateIt(ctx.data);
  const reply =
   ctx.kind === "reschedule"
    ? `Laura ti conferma il nuovo appuntamento per ${dataLabel} alle ${ctx.oraInizio} 🌸`
    : `Ok, appuntamento del ${dataLabel} alle ${ctx.oraInizio} cancellato. Quando vuoi riprenotare, scrivici qui 🌸`;

  const { sendMessage } = await import("@/lib/bot/whatsapp-meta");
  const metaId = await sendMessage(tel, reply, {
   phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID!,
   accessToken: process.env.META_WA_ACCESS_TOKEN!,
  });
  await adm.from("wa_conversations").insert({
   client_id: clientId,
   role: "assistant",
   content: reply,
   meta_message_id: metaId,
  });
 } catch (e) {
  console.warn(
   "[appointment-requests] WA confirmation failed:",
   e instanceof Error ? e.message : e,
  );
 }
}

function formatDateIt(yyyymmdd: string): string {
 // "2026-04-30" → "30 apr"
 const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd);
 if (!m) return yyyymmdd;
 const monthNames = [
  "gen", "feb", "mar", "apr", "mag", "giu",
  "lug", "ago", "set", "ott", "nov", "dic",
 ];
 const mm = parseInt(m[2], 10);
 const dd = parseInt(m[3], 10);
 if (mm < 1 || mm > 12) return yyyymmdd;
 return `${dd} ${monthNames[mm - 1]}`;
}

/**
 * Rifiuta qualsiasi richiesta (nuovo / spostamento / cancellazione).
 * NIENTE WA automatico: Laura scrive a mano per spiegare il motivo.
 */
export async function rejectAppointmentRequest(
 requestId: string,
 noteOperatore?: string,
): Promise<{ ok: boolean; error?: string }> {
 return updateAppointmentRequestStatus(requestId, "rejected", {
  noteOperatore: noteOperatore ?? null,
 });
}
