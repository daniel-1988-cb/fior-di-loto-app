import { describe, it, expect, vi } from "vitest";
import {
  createBookingRequest,
  BOOKING_ACK_REPLY,
  type BookingSupabaseClient,
} from "@/lib/bot/booking";

function makeSupabaseMock(
  onInsert: (row: Record<string, unknown>) => { data: { id: string } | null; error: { message: string } | null },
): BookingSupabaseClient & { inserts: Record<string, unknown>[] } {
  const inserts: Record<string, unknown>[] = [];
  return {
    inserts,
    from: (_table: string) => ({
      insert: (row: Record<string, unknown>) => {
        inserts.push(row);
        return {
          select: (_cols: string) => ({
            single: async () => onInsert(row),
          }),
        };
      },
    }),
  };
}

describe("createBookingRequest", () => {
  it("inserts a pending_review row and returns the new id", async () => {
    const mock = makeSupabaseMock(() => ({
      data: { id: "11111111-1111-1111-1111-111111111111" },
      error: null,
    }));
    const spy = vi.spyOn(mock, "from");

    const result = await createBookingRequest(
      mock,
      "22222222-2222-2222-2222-222222222222",
      "Vorrei prenotare una pressoterapia",
    );

    expect(spy).toHaveBeenCalledWith("appointment_requests");
    expect(mock.inserts).toHaveLength(1);
    expect(mock.inserts[0]).toMatchObject({
      client_id: "22222222-2222-2222-2222-222222222222",
      testo_richiesta: "Vorrei prenotare una pressoterapia",
      stato: "pending_review",
    });
    expect(result.id).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("trims the incoming text before storing", async () => {
    const mock = makeSupabaseMock(() => ({
      data: { id: "33333333-3333-3333-3333-333333333333" },
      error: null,
    }));
    await createBookingRequest(mock, "client-id", "   ciao, appuntamento?   \n");
    expect(mock.inserts[0].testo_richiesta).toBe("ciao, appuntamento?");
  });

  it("throws when the message is empty or whitespace-only", async () => {
    const mock = makeSupabaseMock(() => ({ data: { id: "x" }, error: null }));
    await expect(createBookingRequest(mock, "c", "   ")).rejects.toThrow(
      /testo richiesta vuoto/,
    );
    expect(mock.inserts).toHaveLength(0);
  });

  it("throws if the insert fails", async () => {
    const mock = makeSupabaseMock(() => ({
      data: null,
      error: { message: "constraint violation" },
    }));
    await expect(
      createBookingRequest(mock, "c", "prenotazione"),
    ).rejects.toThrow(/constraint violation/);
  });

  it("exports a hardcoded Italian ack reply", () => {
    expect(BOOKING_ACK_REPLY).toMatch(/Laura/);
    expect(BOOKING_ACK_REPLY.length).toBeGreaterThan(20);
  });
});
