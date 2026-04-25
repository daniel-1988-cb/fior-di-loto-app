/**
 * Unit test per `applyRules` / `ruleMatches` (motore pricing dinamico).
 */

import { describe, expect, it } from "vitest";
import { applyRules, ruleMatches } from "../apply-rules";
import type { PricingRule } from "@/lib/types/pricing";

const SERVICE_A = "11111111-1111-4111-8111-111111111111";
const SERVICE_B = "22222222-2222-4222-8222-222222222222";

function makeRule(partial: Partial<PricingRule>): PricingRule {
  return {
    id: "rule-1",
    nome: "Test rule",
    descrizione: null,
    adjustType: "sconto",
    adjustKind: "percentuale",
    adjustValue: 10,
    giorniSettimana: [],
    oraInizio: null,
    oraFine: null,
    serviziTarget: [],
    dataInizio: null,
    dataFine: null,
    priorita: 0,
    attivo: true,
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
    ...partial,
  };
}

/** Costruisce una Date locale ben definita (no timezone wobble per i test su getDay/HH). */
function localDate(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(y, m - 1, d, h, min, 0, 0);
}

describe("applyRules", () => {
  it("nessuna regola → originalPrice == adjustedPrice, applied null", () => {
    const res = applyRules(50, [], {
      when: localDate(2026, 4, 27, 10, 0),
      serviceId: SERVICE_A,
    });
    expect(res.originalPrice).toBe(50);
    expect(res.adjustedPrice).toBe(50);
    expect(res.applied).toBeNull();
    expect(res.delta).toBe(0);
  });

  it("nessuna regola attiva (tutte attivo=false) → no match", () => {
    const r = makeRule({ attivo: false, adjustValue: 50 });
    const res = applyRules(100, [r], {
      when: localDate(2026, 4, 27, 10, 0),
      serviceId: SERVICE_A,
    });
    expect(res.applied).toBeNull();
    expect(res.adjustedPrice).toBe(100);
  });

  describe("matching giorni + ore + servizi", () => {
    // Rule "Sconto Mattina": -10% lun (1) mar (2) mer (3) tra 09:00 e 12:00, su tutti i servizi.
    const morningRule = makeRule({
      id: "morning",
      nome: "Sconto Mattina",
      adjustType: "sconto",
      adjustKind: "percentuale",
      adjustValue: 10,
      giorniSettimana: [1, 2, 3],
      oraInizio: "09:00",
      oraFine: "12:00",
    });

    it("lunedì 10:00 → applicata", () => {
      // 27 aprile 2026 è un lunedì.
      const res = applyRules(100, [morningRule], {
        when: localDate(2026, 4, 27, 10, 0),
        serviceId: SERVICE_A,
      });
      expect(res.applied?.id).toBe("morning");
      expect(res.adjustedPrice).toBe(90);
      expect(res.delta).toBe(10);
    });

    it("domenica 10:00 → ignorata (giorno fuori range)", () => {
      // 26 aprile 2026 è una domenica.
      const res = applyRules(100, [morningRule], {
        when: localDate(2026, 4, 26, 10, 0),
        serviceId: SERVICE_A,
      });
      expect(res.applied).toBeNull();
      expect(res.adjustedPrice).toBe(100);
    });

    it("lunedì 13:00 → ignorata (ora fuori range)", () => {
      const res = applyRules(100, [morningRule], {
        when: localDate(2026, 4, 27, 13, 0),
        serviceId: SERVICE_A,
      });
      expect(res.applied).toBeNull();
      expect(res.adjustedPrice).toBe(100);
    });

    it("lunedì 12:00 → ignorata (end è esclusivo)", () => {
      const res = applyRules(100, [morningRule], {
        when: localDate(2026, 4, 27, 12, 0),
        serviceId: SERVICE_A,
      });
      expect(res.applied).toBeNull();
    });

    it("lunedì 09:00 → applicata (start è inclusivo)", () => {
      const res = applyRules(100, [morningRule], {
        when: localDate(2026, 4, 27, 9, 0),
        serviceId: SERVICE_A,
      });
      expect(res.applied?.id).toBe("morning");
    });
  });

  describe("serviziTarget specifici", () => {
    const targetedRule = makeRule({
      id: "targeted",
      adjustType: "sconto",
      adjustKind: "percentuale",
      adjustValue: 20,
      serviziTarget: [SERVICE_A],
    });

    it("serviceId match → applicata", () => {
      const res = applyRules(50, [targetedRule], {
        when: localDate(2026, 4, 27, 10, 0),
        serviceId: SERVICE_A,
      });
      expect(res.applied?.id).toBe("targeted");
      expect(res.adjustedPrice).toBe(40);
    });

    it("serviceId diverso → ignorata", () => {
      const res = applyRules(50, [targetedRule], {
        when: localDate(2026, 4, 27, 10, 0),
        serviceId: SERVICE_B,
      });
      expect(res.applied).toBeNull();
    });

    it("serviceId null + serviziTarget non vuoti → ignorata", () => {
      const res = applyRules(50, [targetedRule], {
        when: localDate(2026, 4, 27, 10, 0),
        serviceId: null,
      });
      expect(res.applied).toBeNull();
    });

    it("serviziTarget vuoti + serviceId null → applicata (catch-all)", () => {
      const allRule = makeRule({ id: "all", adjustValue: 5, adjustKind: "fisso" });
      const res = applyRules(50, [allRule], {
        when: localDate(2026, 4, 27, 10, 0),
        serviceId: null,
      });
      expect(res.applied?.id).toBe("all");
      expect(res.adjustedPrice).toBe(45);
    });
  });

  describe("priorità", () => {
    const lowPriority = makeRule({
      id: "low",
      priorita: 1,
      adjustType: "sconto",
      adjustKind: "percentuale",
      adjustValue: 10,
      updatedAt: "2026-04-15T10:00:00Z",
    });
    const highPriority = makeRule({
      id: "high",
      priorita: 10,
      adjustType: "sconto",
      adjustKind: "percentuale",
      adjustValue: 30,
      updatedAt: "2026-04-01T10:00:00Z",
    });

    it("due regole entrambe matchanti → vince priorità più alta", () => {
      const res = applyRules(100, [lowPriority, highPriority], {
        when: localDate(2026, 4, 27, 10, 0),
        serviceId: SERVICE_A,
      });
      expect(res.applied?.id).toBe("high");
      expect(res.adjustedPrice).toBe(70);
    });

    it("ordine di input invariante (commutativo)", () => {
      const res = applyRules(100, [highPriority, lowPriority], {
        when: localDate(2026, 4, 27, 10, 0),
        serviceId: SERVICE_A,
      });
      expect(res.applied?.id).toBe("high");
    });

    it("stessa priorità → vince updatedAt più recente", () => {
      const olderHigh = makeRule({
        id: "older",
        priorita: 5,
        adjustValue: 10,
        updatedAt: "2026-04-01T00:00:00Z",
      });
      const newerHigh = makeRule({
        id: "newer",
        priorita: 5,
        adjustValue: 25,
        updatedAt: "2026-04-20T00:00:00Z",
      });
      const res = applyRules(100, [olderHigh, newerHigh], {
        when: localDate(2026, 4, 27, 10, 0),
        serviceId: SERVICE_A,
      });
      expect(res.applied?.id).toBe("newer");
      expect(res.adjustedPrice).toBe(75);
    });
  });

  describe("clamp a 0", () => {
    it("sconto fisso > prezzo → adjustedPrice 0, delta = unitPrice", () => {
      const r = makeRule({
        adjustType: "sconto",
        adjustKind: "fisso",
        adjustValue: 200,
      });
      const res = applyRules(50, [r], {
        when: localDate(2026, 4, 27, 10, 0),
        serviceId: SERVICE_A,
      });
      expect(res.adjustedPrice).toBe(0);
      expect(res.delta).toBe(50);
    });

    it("sconto percentuale 100% → 0", () => {
      const r = makeRule({ adjustValue: 100 });
      const res = applyRules(50, [r], {
        when: localDate(2026, 4, 27, 10, 0),
        serviceId: SERVICE_A,
      });
      expect(res.adjustedPrice).toBe(0);
    });
  });

  describe("maggiorazione", () => {
    it("maggiorazione percentuale 20% → prezzo aumenta, delta negativo", () => {
      const r = makeRule({
        adjustType: "maggiorazione",
        adjustKind: "percentuale",
        adjustValue: 20,
      });
      const res = applyRules(100, [r], {
        when: localDate(2026, 4, 27, 10, 0),
        serviceId: SERVICE_A,
      });
      expect(res.adjustedPrice).toBe(120);
      expect(res.delta).toBe(-20);
    });

    it("maggiorazione fissa 5€", () => {
      const r = makeRule({
        adjustType: "maggiorazione",
        adjustKind: "fisso",
        adjustValue: 5,
      });
      const res = applyRules(50, [r], {
        when: localDate(2026, 4, 27, 10, 0),
        serviceId: SERVICE_A,
      });
      expect(res.adjustedPrice).toBe(55);
      expect(res.delta).toBe(-5);
    });
  });

  describe("range date", () => {
    it("dentro il range → applicata", () => {
      const r = makeRule({
        dataInizio: "2026-04-01",
        dataFine: "2026-04-30",
      });
      const res = applyRules(100, [r], {
        when: localDate(2026, 4, 15, 10, 0),
        serviceId: SERVICE_A,
      });
      expect(res.applied).not.toBeNull();
    });

    it("dopo il range → ignorata", () => {
      const r = makeRule({
        dataInizio: "2026-04-01",
        dataFine: "2026-04-15",
      });
      const res = applyRules(100, [r], {
        when: localDate(2026, 4, 16, 10, 0),
        serviceId: SERVICE_A,
      });
      expect(res.applied).toBeNull();
    });

    it("prima del range → ignorata", () => {
      const r = makeRule({
        dataInizio: "2026-05-01",
        dataFine: null,
      });
      const res = applyRules(100, [r], {
        when: localDate(2026, 4, 30, 10, 0),
        serviceId: SERVICE_A,
      });
      expect(res.applied).toBeNull();
    });
  });

  describe("ruleMatches direttamente", () => {
    it("attivo=false → false", () => {
      const r = makeRule({ attivo: false });
      expect(
        ruleMatches(r, { when: localDate(2026, 4, 27, 10, 0), serviceId: SERVICE_A }),
      ).toBe(false);
    });

    it("solo oraInizio settata, oraFine null → matcha solo dopo l'inizio", () => {
      const r = makeRule({ oraInizio: "10:00", oraFine: null });
      const ctxBefore = { when: localDate(2026, 4, 27, 9, 0), serviceId: SERVICE_A };
      const ctxAfter = { when: localDate(2026, 4, 27, 10, 0), serviceId: SERVICE_A };
      expect(ruleMatches(r, ctxBefore)).toBe(false);
      expect(ruleMatches(r, ctxAfter)).toBe(true);
    });
  });
});
