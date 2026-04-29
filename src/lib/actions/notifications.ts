"use server";

import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WAFailureNotification = {
  id: string;
  appointmentId: string;
  createdAt: string;
  error: string;
  channel: "whatsapp" | "email";
  source: "reminder" | "followup";
  usedTemplateName: string | null;
  clienteNome: string;
  clienteCognome: string;
  clienteTelefono: string | null;
  apptData: string;
  apptOra: string;
  servizioNome: string | null;
};

export type AppointmentRequestNotification = {
  id: string;
  clientId: string;
  clientName: string;
  testoRichiesta: string;
  createdAt: string;
};

export type StockAlertNotification = {
  id: string;
  nome: string;
  categoria: string | null;
  giacenza: number;
  sogliaAlert: number;
  // "out" se giacenza = 0, "low" se 0 < giacenza <= soglia.
  level: "out" | "low";
};

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

/**
 * Recent (last 24h) WhatsApp / email send failures from reminders + follow-ups.
 *
 * Source: Postgres view `wa_send_failures_recent` (defined in Supabase, joins
 * the underlying log table to clients/appointments/services). The view does
 * the heavy lifting; we just normalize into camelCase for the UI.
 */
export async function listRecentWAFailures(): Promise<WAFailureNotification[]> {
  const adm = createAdminClient();
  // The view is not in the generated database.types yet, so we use a raw
  // typed call via `from(... as any)` — kept narrow to the `notifications`
  // codepath, not exported.
  const { data, error } = await adm
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("wa_send_failures_recent" as any)
    .select(
      "id, appointment_id, created_at, error, channel, source, used_template_name, cliente_nome, cliente_cognome, cliente_telefono, appt_data, appt_ora, servizio_nome",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];

  return (data as unknown as Array<Record<string, unknown>>).map((r) => {
    const channelRaw = String(r.channel ?? "whatsapp");
    const channel: WAFailureNotification["channel"] =
      channelRaw === "email" ? "email" : "whatsapp";
    const sourceRaw = String(r.source ?? "reminder");
    const source: WAFailureNotification["source"] =
      sourceRaw === "followup" ? "followup" : "reminder";
    const apptOraRaw = (r.appt_ora as string | null) ?? "";
    return {
      id: String(r.id),
      appointmentId: String(r.appointment_id ?? ""),
      createdAt: String(r.created_at ?? ""),
      error: String(r.error ?? ""),
      channel,
      source,
      usedTemplateName: (r.used_template_name as string | null) ?? null,
      clienteNome: (r.cliente_nome as string | null) ?? "",
      clienteCognome: (r.cliente_cognome as string | null) ?? "",
      clienteTelefono: (r.cliente_telefono as string | null) ?? null,
      apptData: (r.appt_data as string | null) ?? "",
      apptOra: apptOraRaw ? apptOraRaw.slice(0, 5) : "",
      servizioNome: (r.servizio_nome as string | null) ?? null,
    } satisfies WAFailureNotification;
  });
}

/**
 * Pending appointment requests (richieste WhatsApp da triare). Used for the
 * "Richieste" tab in the notification drawer — a thin slice of the existing
 * /whatsapp/richieste page (no joined snapshots, no actions).
 */
export async function listPendingAppointmentRequests(): Promise<
  AppointmentRequestNotification[]
> {
  const adm = createAdminClient();
  const { data: rows, error } = await adm
    .from("appointment_requests")
    .select("id, client_id, testo_richiesta, created_at")
    .eq("stato", "pending_review")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !rows || rows.length === 0) return [];

  const clientIds = Array.from(new Set(rows.map((r) => r.client_id as string)));
  const { data: clients } = await adm
    .from("clients")
    .select("id, nome, cognome")
    .in("id", clientIds);
  const byId = new Map(
    (clients ?? []).map((c) => [
      c.id as string,
      `${(c.nome as string | null) ?? ""} ${(c.cognome as string | null) ?? ""}`.trim() ||
        "Sconosciuto",
    ]),
  );

  return rows.map((r) => ({
    id: r.id as string,
    clientId: r.client_id as string,
    clientName: byId.get(r.client_id as string) ?? "Sconosciuto",
    testoRichiesta: (r.testo_richiesta as string) ?? "",
    createdAt: r.created_at as string,
  }));
}

/**
 * Prodotti attivi con giacenza sotto la soglia di allerta (o esauriti).
 *
 *   level "out" → giacenza = 0 (priorità massima, badge rosso)
 *   level "low" → 0 < giacenza <= soglia_alert (badge ambra)
 *
 * Filtri:
 *  - attivo = true (escludi prodotti dismessi)
 *  - soglia_alert IS NOT NULL (se non configurata, niente alert)
 *
 * Ordina per level (out prima) + giacenza ASC + nome.
 */
export async function listStockAlerts(): Promise<StockAlertNotification[]> {
  const adm = createAdminClient();
  const { data, error } = await adm
    .from("products")
    .select("id, nome, categoria, giacenza, soglia_alert")
    .eq("attivo", true)
    .not("soglia_alert", "is", null)
    .order("giacenza", { ascending: true })
    .order("nome", { ascending: true });
  if (error || !data) return [];
  const out: StockAlertNotification[] = [];
  for (const r of data) {
    const giacenza = Number(r.giacenza ?? 0);
    const soglia = Number(r.soglia_alert ?? 0);
    if (giacenza > soglia) continue;
    out.push({
      id: String(r.id),
      nome: String(r.nome ?? ""),
      categoria: (r.categoria as string | null) ?? null,
      giacenza,
      sogliaAlert: soglia,
      level: giacenza === 0 ? "out" : "low",
    });
  }
  // out (giacenza=0) prima dei low
  out.sort((a, b) => {
    if (a.level !== b.level) return a.level === "out" ? -1 : 1;
    if (a.giacenza !== b.giacenza) return a.giacenza - b.giacenza;
    return a.nome.localeCompare(b.nome);
  });
  return out;
}
