import { describe, it, expect } from "vitest";
import { detectIntent } from "@/lib/bot/intent";

describe("detectIntent", () => {
  it("escalate on 'parlare con Laura'", () => {
    expect(detectIntent("Voglio parlare con Laura")).toBe("escalate");
    expect(detectIntent("voglio parlare direttamente con laura")).toBe("escalate");
  });
  it("booking_request on booking keywords", () => {
    expect(detectIntent("vorrei prenotare un appuntamento")).toBe("booking_request");
    expect(detectIntent("posso fissare una call?")).toBe("booking_request");
  });
  it("opt_out on stop keywords", () => {
    expect(detectIntent("non scrivermi più")).toBe("opt_out");
    expect(detectIntent("STOP")).toBe("opt_out");
  });
  it("generic otherwise", () => {
    expect(detectIntent("Ciao, info sul Metodo Rinascita")).toBe("generic");
  });

  describe("reschedule_request", () => {
    it("matches 'spostare l'appuntamento'", () => {
      expect(detectIntent("vorrei spostare l'appuntamento")).toBe("reschedule_request");
    });
    it("matches 'posticipare/anticipare/rimandare'", () => {
      expect(detectIntent("posso posticipare di un'ora?")).toBe("reschedule_request");
      expect(detectIntent("vorrei anticipare il mio appuntamento")).toBe("reschedule_request");
      expect(detectIntent("possiamo rimandare a giovedì?")).toBe("reschedule_request");
    });
    it("matches imperatives and pronominal forms", () => {
      expect(detectIntent("spostami il mio appuntamento per favore")).toBe("reschedule_request");
      expect(detectIntent("lo possiamo spostare?")).toBe("reschedule_request");
    });
    it("matches 'cambiare data/ora/giorno'", () => {
      expect(detectIntent("posso cambiare la data?")).toBe("reschedule_request");
      expect(detectIntent("vorrei cambiare l'ora")).toBe("reschedule_request");
    });
    it("does NOT confuse generic 'cambiare' without subject", () => {
      // questo non parla di appuntamento → resta generic.
      expect(detectIntent("come cambia il prezzo?")).toBe("generic");
    });
    it("PRIORITY: reschedule beats booking when both verbs co-occur", () => {
      // "spostare" deve vincere su "appuntamento" anche se quest'ultimo
      // è citato dopo. Senza il pattern reschedule prima di booking, frasi
      // come "voglio spostare l'appuntamento" finivano in booking_request.
      expect(detectIntent("voglio spostare l'appuntamento di domani")).toBe(
        "reschedule_request",
      );
    });
  });

  describe("cancel_request", () => {
    it("matches 'annullare/cancellare/disdire l'appuntamento'", () => {
      expect(detectIntent("vorrei annullare l'appuntamento")).toBe("cancel_request");
      expect(detectIntent("posso cancellare la seduta di domani?")).toBe("cancel_request");
      expect(detectIntent("devo disdire l'appuntamento")).toBe("cancel_request");
    });
    it("matches 'non vengo più / non posso venire'", () => {
      expect(detectIntent("non vengo più")).toBe("cancel_request");
      expect(detectIntent("non posso venire domani")).toBe("cancel_request");
    });
    it("does NOT match bare 'stop' (that's opt_out)", () => {
      expect(detectIntent("stop")).toBe("opt_out");
    });
    it("does NOT match bare 'cancella' (still opt_out)", () => {
      expect(detectIntent("cancella")).toBe("opt_out");
    });
    it("PRIORITY: cancel beats reschedule when both intents are present", () => {
      // "non vengo più" è inequivocabilmente cancellazione anche se nel
      // resto del messaggio c'è la parola "spostare"
      expect(detectIntent("non vengo più, magari spostiamo a settimana prossima")).toBe(
        "cancel_request",
      );
    });
  });
});
