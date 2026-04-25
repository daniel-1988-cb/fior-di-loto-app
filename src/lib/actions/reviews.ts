"use server";

import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, sanitizeString, truncate } from "@/lib/security/validate";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export type ReviewRequestRow = {
  id: string;
  client_id: string;
  appointment_id: string | null;
  token: string;
  canale: string;
  sent_at: string;
  clicked_at: string | null;
  submitted_at: string | null;
  rating: number | null;
  feedback_text: string | null;
  redirected_google: boolean;
  created_at: string;
  clients?: { nome: string; cognome: string } | null;
};

export type ClientReviewRow = {
  id: string;
  client_id: string;
  review_request_id: string | null;
  rating: number;
  testo: string | null;
  published_google: boolean;
  created_at: string;
  clients?: { nome: string; cognome: string } | null;
};

/**
 * Token URL-safe da 24 caratteri, random crypto. crypto.randomUUID → 32 hex
 * senza trattini, prendiamo 24 caratteri = 96 bit di entropia (più che
 * sufficienti per identificatori monouso). Non usiamo base64url per evitare
 * caratteri speciali nell'URL.
 */
function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

export async function createReviewRequest(opts: {
  clientId: string;
  appointmentId?: string | null;
  canale?: "whatsapp" | "sms" | "email";
}): Promise<{ ok: true; token: string; id: string } | { ok: false; error: string }> {
  if (!isValidUUID(opts.clientId)) return { ok: false, error: "clientId non valido" };
  if (opts.appointmentId && !isValidUUID(opts.appointmentId)) {
    return { ok: false, error: "appointmentId non valido" };
  }
  const canale = opts.canale ?? "whatsapp";
  if (!["whatsapp", "sms", "email"].includes(canale)) {
    return { ok: false, error: "canale non valido" };
  }

  const supabase = createAdminClient();
  // Loop retry su collision token (estremamente improbabile su 96 bit ma
  // abbiamo un UNIQUE constraint — meglio fallback che crash).
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateToken();
    const { data, error } = await supabase
      .from("review_requests")
      .insert({
        client_id: opts.clientId,
        appointment_id: opts.appointmentId ?? null,
        token,
        canale,
      })
      .select("id, token")
      .single();
    if (!error && data) {
      return { ok: true, token: data.token as string, id: data.id as string };
    }
    // 23505 = unique_violation su token
    if (error && (error as { code?: string }).code !== "23505") {
      console.error("[reviews] createReviewRequest error:", error);
      return { ok: false, error: error.message || "insert failed" };
    }
  }
  return { ok: false, error: "impossibile generare token univoco" };
}

export async function trackReviewClick(token: string): Promise<ReviewRequestRow | null> {
  if (!token || !/^[a-f0-9]{8,32}$/i.test(token)) return null;
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("review_requests")
    .select("*, clients(nome, cognome)")
    .eq("token", token)
    .maybeSingle();
  if (error || !row) return null;

  // clicked_at viene settato solo al primo click (idempotente per log
  // coerente — ma comunque popoliamo con NOW() sempre per allineare retrying
  // in caso di cache). Per evitare update a ogni hit se già cliccato,
  // condizioniamo sul NULL.
  if (!(row as ReviewRequestRow).clicked_at) {
    await supabase
      .from("review_requests")
      .update({ clicked_at: new Date().toISOString() })
      .eq("id", (row as ReviewRequestRow).id)
      .is("clicked_at", null);
  }

  return row as ReviewRequestRow;
}

export async function submitReview(
  token: string,
  { rating, text }: { rating: number; text?: string | null },
): Promise<
  | {
      ok: true;
      clientReviewId: string;
      shouldRedirectGoogle: boolean;
      googleUrl: string | null;
    }
  | { ok: false; error: string }
> {
  if (!token || !/^[a-f0-9]{8,32}$/i.test(token)) {
    return { ok: false, error: "token non valido" };
  }
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return { ok: false, error: "rating deve essere 1-5" };
  }
  const cleanedText = text
    ? truncate(sanitizeString(String(text)), 2000) || null
    : null;

  const supabase = createAdminClient();

  const { data: rrRow, error: rrErr } = await supabase
    .from("review_requests")
    .select("id, client_id, submitted_at")
    .eq("token", token)
    .maybeSingle();
  if (rrErr || !rrRow) return { ok: false, error: "review request non trovata" };
  if ((rrRow as { submitted_at: string | null }).submitted_at) {
    return { ok: false, error: "questa recensione è già stata inviata" };
  }

  // Fetch google_review_url per capire se reindirizzare.
  const { data: settings } = await supabase
    .from("business_settings")
    .select("google_review_url")
    .eq("id", SETTINGS_ID)
    .maybeSingle();
  const googleUrl =
    (settings as { google_review_url: string | null } | null)?.google_review_url ?? null;
  const shouldRedirectGoogle = r >= 4 && Boolean(googleUrl);

  // Inserisci client_reviews
  const { data: crRow, error: crErr } = await supabase
    .from("client_reviews")
    .insert({
      client_id: (rrRow as { client_id: string }).client_id,
      review_request_id: (rrRow as { id: string }).id,
      rating: r,
      testo: cleanedText,
      published_google: false, // aggiornato dopo se segue redirect
    })
    .select("id")
    .single();
  if (crErr || !crRow) {
    console.error("[reviews] submitReview insert error:", crErr);
    return { ok: false, error: crErr?.message || "insert failed" };
  }

  // Aggiorna review_requests
  await supabase
    .from("review_requests")
    .update({
      submitted_at: new Date().toISOString(),
      rating: r,
      feedback_text: cleanedText,
      redirected_google: shouldRedirectGoogle,
    })
    .eq("id", (rrRow as { id: string }).id);

  if (shouldRedirectGoogle) {
    await supabase
      .from("client_reviews")
      .update({ published_google: true })
      .eq("id", (crRow as { id: string }).id);
  }

  return {
    ok: true,
    clientReviewId: (crRow as { id: string }).id,
    shouldRedirectGoogle,
    googleUrl: shouldRedirectGoogle ? googleUrl : null,
  };
}

export type ReviewStats = {
  sent: number;
  clicked: number;
  submitted: number;
  redirected_google: number;
  rating_media: number | null;
  rating_distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export async function getReviewStats(periodo?: {
  from?: string;
  to?: string;
}): Promise<ReviewStats> {
  const supabase = createAdminClient();

  let q = supabase
    .from("review_requests")
    .select("clicked_at, submitted_at, rating, redirected_google, sent_at");
  if (periodo?.from) q = q.gte("sent_at", periodo.from);
  if (periodo?.to) q = q.lte("sent_at", periodo.to);

  const { data, error } = await q;
  if (error) {
    console.error("[reviews] getReviewStats error:", error);
    return {
      sent: 0,
      clicked: 0,
      submitted: 0,
      redirected_google: 0,
      rating_media: null,
      rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const rows = (data as Array<{
    clicked_at: string | null;
    submitted_at: string | null;
    rating: number | null;
    redirected_google: boolean;
  }>) || [];

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let ratingSum = 0;
  let ratingCount = 0;
  let clicked = 0;
  let submitted = 0;
  let redirected = 0;
  for (const r of rows) {
    if (r.clicked_at) clicked++;
    if (r.submitted_at) submitted++;
    if (r.redirected_google) redirected++;
    if (r.rating && r.rating >= 1 && r.rating <= 5) {
      distribution[r.rating as 1 | 2 | 3 | 4 | 5]++;
      ratingSum += r.rating;
      ratingCount++;
    }
  }

  return {
    sent: rows.length,
    clicked,
    submitted,
    redirected_google: redirected,
    rating_media: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    rating_distribution: distribution,
  };
}

export async function getRecentReviews(limit = 20): Promise<ClientReviewRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_reviews")
    .select("*, clients(nome, cognome)")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(100, limit)));
  if (error) {
    console.error("[reviews] getRecentReviews error:", error);
    return [];
  }
  return (data as ClientReviewRow[]) || [];
}

/**
 * Recensioni di un singolo cliente — tutte le `client_reviews` (submitted) +
 * eventuali `review_requests` ancora aperte (clicked ma non submitted, o
 * solo inviate). Usato dal tab "Recensioni" del profilo cliente.
 */
export async function getClientReviews(clientId: string): Promise<{
  reviews: ClientReviewRow[];
  pendingRequests: ReviewRequestRow[];
}> {
  if (!isValidUUID(clientId)) return { reviews: [], pendingRequests: [] };
  const supabase = createAdminClient();
  const [reviewsRes, requestsRes] = await Promise.all([
    supabase
      .from("client_reviews")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("review_requests")
      .select("*")
      .eq("client_id", clientId)
      .is("submitted_at", null)
      .order("sent_at", { ascending: false })
      .limit(20),
  ]);
  if (reviewsRes.error) {
    console.error("[reviews] getClientReviews reviews error:", reviewsRes.error);
  }
  if (requestsRes.error) {
    console.error("[reviews] getClientReviews requests error:", requestsRes.error);
  }
  return {
    reviews: (reviewsRes.data as ClientReviewRow[]) || [],
    pendingRequests: (requestsRes.data as ReviewRequestRow[]) || [],
  };
}

export async function getPendingReviewRequests(limit = 50): Promise<ReviewRequestRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("review_requests")
    .select("*, clients(nome, cognome)")
    .is("submitted_at", null)
    .order("sent_at", { ascending: false })
    .limit(Math.max(1, Math.min(200, limit)));
  if (error) {
    console.error("[reviews] getPendingReviewRequests error:", error);
    return [];
  }
  return (data as ReviewRequestRow[]) || [];
}

/**
 * Usato dal cron per capire quali appuntamenti completati ieri non hanno
 * ancora ricevuto la richiesta review. Filtra stato='completato', data=ieri
 * (Europe/Rome tramite server UTC — per Campobasso +1/+2h, il cron gira alle
 * 03:00 UTC quindi "ieri" coincide). Skippa clienti senza telefono o
 * wa_opt_in=false e quelli con una review_request già esistente per
 * quell'appt.
 */
export async function getAppointmentsNeedingReviewRequest(): Promise<
  Array<{
    appointment_id: string;
    client_id: string;
    client_nome: string;
    client_telefono: string;
  }>
> {
  const supabase = createAdminClient();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dataStr = yesterday.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, client_id, clients(id, nome, telefono, wa_opt_in)",
    )
    .eq("data", dataStr)
    .eq("stato", "completato");
  if (error || !data) {
    if (error) console.error("[reviews] getAppointmentsNeedingReviewRequest error:", error);
    return [];
  }

  // Filtra lato app (più semplice del not-exists SQL). Prendiamo tutti gli
  // appointment_id esistenti in review_requests in un colpo solo.
  const apptIds = (data as Array<{ id: string }>).map((a) => a.id);
  if (apptIds.length === 0) return [];

  const { data: existing } = await supabase
    .from("review_requests")
    .select("appointment_id")
    .in("appointment_id", apptIds);
  const existingSet = new Set(
    ((existing as Array<{ appointment_id: string | null }> | null) || [])
      .map((r) => r.appointment_id)
      .filter(Boolean) as string[],
  );

  type Row = {
    id: string;
    client_id: string;
    clients:
      | {
          id: string;
          nome: string;
          telefono: string | null;
          wa_opt_in: boolean;
        }
      | Array<{
          id: string;
          nome: string;
          telefono: string | null;
          wa_opt_in: boolean;
        }>
      | null;
  };

  const rows = data as unknown as Row[];

  // Filtra SOLO primo appuntamento completato del cliente. Non spammiamo
  // recensioni ai clienti abitudinari — solo alla prima esperienza. Query
  // aggregata: per ogni client_id nel batch, conta gli appuntamenti completati
  // con data <= yesterday. Se > 1, ha già completato almeno un altro appt
  // in passato → skippa.
  const clientIds = Array.from(new Set(rows.map((r) => r.client_id)));
  const pastCompletedByClient = new Map<string, number>();
  if (clientIds.length > 0) {
    const { data: pastAppts } = await supabase
      .from("appointments")
      .select("client_id")
      .in("client_id", clientIds)
      .eq("stato", "completato")
      .lt("data", dataStr);
    for (const row of (pastAppts ?? []) as Array<{ client_id: string }>) {
      pastCompletedByClient.set(
        row.client_id,
        (pastCompletedByClient.get(row.client_id) ?? 0) + 1,
      );
    }
  }

  // Inoltre skippa clienti che hanno GIÀ inviato/ricevuto una review_request
  // in precedenza per QUALSIASI appuntamento — difesa extra oltre alla logica
  // "primo trattamento" (es. se il primo appt era pre-migration senza flag
  // completato corretto, non rimandiamo la richiesta).
  const { data: existingReqByClient } = await supabase
    .from("review_requests")
    .select("client_id")
    .in("client_id", clientIds);
  const reviewedClients = new Set(
    ((existingReqByClient as Array<{ client_id: string }> | null) ?? []).map(
      (r) => r.client_id,
    ),
  );

  return rows
    .filter((row) => !existingSet.has(row.id)) // appt senza review_request
    .filter((row) => (pastCompletedByClient.get(row.client_id) ?? 0) === 0) // primo completato del cliente
    .filter((row) => !reviewedClients.has(row.client_id)) // cliente mai ricevuto prima una richiesta
    .map((row) => {
      const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
      return { row, client };
    })
    .filter(
      ({ client }) =>
        client &&
        client.wa_opt_in &&
        client.telefono &&
        client.telefono.trim().length > 0,
    )
    .map(({ row, client }) => ({
      appointment_id: row.id,
      client_id: row.client_id,
      client_nome: client!.nome,
      client_telefono: client!.telefono!,
    }));
}
