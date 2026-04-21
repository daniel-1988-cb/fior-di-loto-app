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
});
