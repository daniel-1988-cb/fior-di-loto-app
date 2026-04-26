// Helpers for booking-request handling from the WhatsApp bot.
// `createBookingRequest` inserts a preliminary row into `appointment_requests`
// that Laura can later triage into a real `appointments` row.
//
// Kept as a pure function taking a Supabase-like client so it's trivial to
// mock in tests — we don't want the test suite to reach the real DB.

// We intentionally model only the sliver of the Supabase client we actually
// call. The real @supabase/supabase-js returns a PostgrestBuilder that is
// thenable but not a native Promise, so we type `single()` as a PromiseLike.
export type BookingInsertResult = {
  data: { id: string } | null;
  error: { message: string } | null;
};

export type BookingSupabaseClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => PromiseLike<BookingInsertResult>;
      };
    };
  };
};

export const BOOKING_ACK_REPLY =
  "Ti ho girato la richiesta a Laura, ti confermiamo orario e operatrice entro oggi 🌸";

export type BookingNotifyContext = {
  /** uuid della riga `appointment_requests` appena inserita. Usato come tag
   *  push per de-duplicare a livello OS senza collassare richieste diverse. */
  requestId: string;
  /** Testo trimmato del messaggio originale. */
  testo: string;
  /** Nome (o nome+cognome) cliente, se conosciuto. Fallback: telefono. */
  clientName?: string;
  /** Telefono in formato +E.164, mostrato solo se `clientName` è vuoto. */
  fromPhone?: string;
};

/**
 * Invia una notifica push a tutti gli operatori registrati segnalando
 * una nuova richiesta di prenotazione dal bot WhatsApp.
 *
 * Best-effort: tutti gli errori sono catturati e loggati come warning —
 * un fallimento push NON deve far fallire l'insert del booking request.
 *
 * Implementato come `() => Promise<void>` per facilitarne il mock nei test
 * di `createBookingRequest`.
 */
export async function notifyAppointmentRequest(
  ctx: BookingNotifyContext,
): Promise<void> {
  try {
    // Lazy import: `push.ts` carica `web-push` (solo Node), che non vogliamo
    // valutare se la chiamata viene mockata o se l'env VAPID non è settato.
    const { sendPushToAll } = await import("@/lib/actions/push");

    const who =
      ctx.clientName?.trim() ||
      (ctx.fromPhone ? `+${ctx.fromPhone.replace(/^\+/, "")}` : "cliente");
    const preview = ctx.testo.replace(/\s+/g, " ").trim().slice(0, 80);

    await sendPushToAll({
      title: `Nuova richiesta da ${who}`,
      body: preview || "Apri il gestionale per vederla.",
      url: "/whatsapp/richieste",
      // Tag per-richiesta: notifiche distinte per ogni nuova booking,
      // ma re-invii dello stesso requestId vengono collassati dall'OS.
      tag: `appt_req_${ctx.requestId}`,
    });
  } catch (e) {
    console.warn(
      "[booking] notifyAppointmentRequest failed:",
      e instanceof Error ? e.message : e,
    );
  }
}

export async function createBookingRequest(
  supabase: BookingSupabaseClient,
  clientId: string,
  testo: string,
  /** Metadati opzionali per la notifica push. Se mancano, la notifica usa
   *  fallback generici. Iniettabile per i test (`notify` mock). */
  options?: {
    clientName?: string;
    fromPhone?: string;
    notify?: (ctx: BookingNotifyContext) => Promise<void>;
  },
): Promise<{ id: string }> {
  const trimmed = (testo ?? "").trim();
  if (!trimmed) throw new Error("testo richiesta vuoto");

  const { data, error } = await supabase
    .from("appointment_requests")
    .insert({
      client_id: clientId,
      testo_richiesta: trimmed,
      stato: "pending_review",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`insert appointment_requests failed: ${error?.message ?? "no data"}`);
  }

  // Notifica push best-effort. Un eventuale errore qui NON deve mai
  // ribaltare l'insert: il booking è già salvato, peggio che peggio
  // Laura lo vede dal badge in /whatsapp/richieste come prima.
  const notify = options?.notify ?? notifyAppointmentRequest;
  try {
    await notify({
      requestId: data.id,
      testo: trimmed,
      clientName: options?.clientName,
      fromPhone: options?.fromPhone,
    });
  } catch (e) {
    console.warn(
      "[booking] notify hook threw:",
      e instanceof Error ? e.message : e,
    );
  }

  return { id: data.id };
}
