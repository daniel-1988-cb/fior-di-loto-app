import { describe, it, expect, vi } from "vitest";
import {
  createBookingRequest,
  BOOKING_ACK_REPLY,
  type BookingSupabaseClient,
  type BookingNotifyContext,
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

// Default no-op notify per non innescare il caricamento di `push.ts`
// (che importa web-push) durante i test che non lo testano direttamente.
const noopNotify = vi.fn(async (_ctx: BookingNotifyContext) => {});

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
      { notify: noopNotify },
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
    await createBookingRequest(
      mock,
      "client-id",
      "   ciao, appuntamento?   \n",
      { notify: noopNotify },
    );
    expect(mock.inserts[0].testo_richiesta).toBe("ciao, appuntamento?");
  });

  it("throws when the message is empty or whitespace-only", async () => {
    const mock = makeSupabaseMock(() => ({ data: { id: "x" }, error: null }));
    await expect(
      createBookingRequest(mock, "c", "   ", { notify: noopNotify }),
    ).rejects.toThrow(/testo richiesta vuoto/);
    expect(mock.inserts).toHaveLength(0);
  });

  it("throws if the insert fails", async () => {
    const mock = makeSupabaseMock(() => ({
      data: null,
      error: { message: "constraint violation" },
    }));
    await expect(
      createBookingRequest(mock, "c", "prenotazione", { notify: noopNotify }),
    ).rejects.toThrow(/constraint violation/);
  });

  it("exports a hardcoded Italian ack reply", () => {
    expect(BOOKING_ACK_REPLY).toMatch(/Laura/);
    expect(BOOKING_ACK_REPLY.length).toBeGreaterThan(20);
  });

  it("invokes the notify hook with requestId, testo, name and phone", async () => {
    const mock = makeSupabaseMock(() => ({
      data: { id: "44444444-4444-4444-4444-444444444444" },
      error: null,
    }));
    const notify = vi.fn(async (_ctx: BookingNotifyContext) => {});

    await createBookingRequest(mock, "client-id", "domani pomeriggio?", {
      clientName: "Anna Rossi",
      fromPhone: "393880637725",
      notify,
    });

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith({
      requestId: "44444444-4444-4444-4444-444444444444",
      testo: "domani pomeriggio?",
      clientName: "Anna Rossi",
      fromPhone: "393880637725",
    });
  });

  it("does NOT invoke notify when the insert fails", async () => {
    const mock = makeSupabaseMock(() => ({
      data: null,
      error: { message: "boom" },
    }));
    const notify = vi.fn(async (_ctx: BookingNotifyContext) => {});

    await expect(
      createBookingRequest(mock, "c", "prenotazione", { notify }),
    ).rejects.toThrow(/boom/);
    expect(notify).not.toHaveBeenCalled();
  });

  it("swallows notify errors and still returns the booking id", async () => {
    const mock = makeSupabaseMock(() => ({
      data: { id: "55555555-5555-5555-5555-555555555555" },
      error: null,
    }));
    const notify = vi.fn(async () => {
      throw new Error("push subsystem exploded");
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await createBookingRequest(
      mock,
      "c",
      "prenotazione",
      { notify },
    );

    expect(result.id).toBe("55555555-5555-5555-5555-555555555555");
    expect(notify).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
