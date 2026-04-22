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

export async function createBookingRequest(
  supabase: BookingSupabaseClient,
  clientId: string,
  testo: string,
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
  return { id: data.id };
}
