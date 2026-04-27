import { describe, it, expect } from "vitest";
import { buildCatalogBlock } from "../catalog-context";
import type { ServiceForBot } from "@/lib/types/bot";

describe("buildCatalogBlock", () => {
  it("returns empty string when no services", () => {
    expect(buildCatalogBlock([])).toBe("");
  });

  it("formats single service with all fields", () => {
    const services: ServiceForBot[] = [
      {
        nome: "Pulizia Viso",
        categoria: "viso",
        durata: 50,
        prezzo: 60,
        descrizione: "Detergente, scrub, estrazione comedoni, maschera personalizzata.",
      },
    ];
    const out = buildCatalogBlock(services);
    expect(out).toContain("CATALOGO SERVIZI");
    expect(out).toContain("## VISO");
    expect(out).toContain("Pulizia Viso");
    expect(out).toContain("50min");
    expect(out).toContain("60€");
    expect(out).toContain("Detergente, scrub");
  });

  it("groups services by categoria", () => {
    const services: ServiceForBot[] = [
      { nome: "Pulizia Viso", categoria: "viso", durata: 50, prezzo: 60, descrizione: null },
      { nome: "Pressoterapia", categoria: "corpo", durata: 60, prezzo: 50, descrizione: null },
      { nome: "Massaggio Decontratturante", categoria: "massaggi", durata: 60, prezzo: 70, descrizione: null },
    ];
    const out = buildCatalogBlock(services);
    expect(out).toContain("## VISO");
    expect(out).toContain("## CORPO");
    expect(out).toContain("## MASSAGGI");
    const visoIdx = out.indexOf("## VISO");
    const corpoIdx = out.indexOf("## CORPO");
    expect(visoIdx).toBeLessThan(corpoIdx);
  });

  it("omits descrizione line when null", () => {
    const services: ServiceForBot[] = [
      { nome: "Test", categoria: "viso", durata: 30, prezzo: 40, descrizione: null },
    ];
    const out = buildCatalogBlock(services);
    expect(out).toContain("- Test — 30min — 40€");
    expect(out).not.toMatch(/Test.*\n\s+null/);
  });

  it("truncates when total exceeds MAX_CHARS with placeholder", () => {
    const longDesc = "A".repeat(800);
    const services: ServiceForBot[] = Array.from({ length: 20 }, (_, i) => ({
      nome: `Servizio ${i}`,
      categoria: "viso",
      durata: 30,
      prezzo: 40,
      descrizione: longDesc,
    }));
    const out = buildCatalogBlock(services);
    expect(out.length).toBeLessThan(7000);
    expect(out).toContain("altri servizi disponibili");
  });

  it("formats price as integer (no cents)", () => {
    const services: ServiceForBot[] = [
      { nome: "Test", categoria: "viso", durata: 30, prezzo: 49.5, descrizione: null },
    ];
    const out = buildCatalogBlock(services);
    expect(out).toContain("50€");
  });
});
