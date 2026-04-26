import { describe, it, expect, vi, beforeEach } from "vitest";

// `notifyAppointmentRequest` lazy-imports `@/lib/actions/push`. Mockiamo l'intero
// modulo prima del SUT in modo che `web-push` non venga mai valutato.
const sendPushToAll = vi.fn(async () => ({ sent: 0, removed: 0, errors: 0 }));
vi.mock("@/lib/actions/push", () => ({
  sendPushToAll,
}));

import { notifyAppointmentRequest } from "@/lib/bot/booking";

describe("notifyAppointmentRequest", () => {
  beforeEach(() => {
    sendPushToAll.mockClear();
  });

  it("invia push con titolo basato sul nome cliente e tag per-richiesta", async () => {
    await notifyAppointmentRequest({
      requestId: "req-uuid-1",
      testo: "Vorrei prenotare una pressoterapia per martedì",
      clientName: "Anna Rossi",
      fromPhone: "393880637725",
    });

    expect(sendPushToAll).toHaveBeenCalledTimes(1);
    const payload = sendPushToAll.mock.calls[0][0] as {
      title: string;
      body: string;
      url: string;
      tag: string;
    };
    expect(payload.title).toBe("Nuova richiesta da Anna Rossi");
    expect(payload.body).toContain("pressoterapia");
    expect(payload.url).toBe("/whatsapp/richieste");
    expect(payload.tag).toBe("appt_req_req-uuid-1");
  });

  it("usa il telefono come fallback quando il nome cliente manca", async () => {
    await notifyAppointmentRequest({
      requestId: "req-uuid-2",
      testo: "Domani pomeriggio?",
      fromPhone: "393880637725",
    });

    const payload = sendPushToAll.mock.calls[0][0] as { title: string };
    expect(payload.title).toBe("Nuova richiesta da +393880637725");
  });

  it("usa 'cliente' come fallback finale quando nome e phone mancano", async () => {
    await notifyAppointmentRequest({
      requestId: "req-uuid-3",
      testo: "appuntamento",
    });

    const payload = sendPushToAll.mock.calls[0][0] as { title: string };
    expect(payload.title).toBe("Nuova richiesta da cliente");
  });

  it("tronca il body a 80 caratteri e collassa whitespace", async () => {
    const lungo =
      "Ciao,    vorrei prenotare\n\nuna seduta lunghissima per il prossimo " +
      "lunedì pomeriggio se è possibile, anche martedì mattina va bene grazie.";
    await notifyAppointmentRequest({
      requestId: "req-uuid-4",
      testo: lungo,
      clientName: "Maria",
    });

    const payload = sendPushToAll.mock.calls[0][0] as { body: string };
    expect(payload.body.length).toBeLessThanOrEqual(80);
    // Niente sequenze di whitespace consecutive.
    expect(payload.body).not.toMatch(/\s{2,}/);
  });

  it("usa fallback body quando il testo è vuoto", async () => {
    await notifyAppointmentRequest({
      requestId: "req-uuid-5",
      testo: "   ",
      clientName: "Maria",
    });

    const payload = sendPushToAll.mock.calls[0][0] as { body: string };
    expect(payload.body).toMatch(/Apri il gestionale/);
  });

  it("ignora gli errori di sendPushToAll (best-effort)", async () => {
    sendPushToAll.mockRejectedValueOnce(new Error("VAPID not configured"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      notifyAppointmentRequest({
        requestId: "req-uuid-6",
        testo: "test",
      }),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
