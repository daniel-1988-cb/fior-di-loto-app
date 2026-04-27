import type { ServiceForBot } from "@/lib/types/bot";

export type { ServiceForBot };

/**
 * Costruisce il blocco "CATALOGO SERVIZI" da iniettare nel systemInstruction
 * di Gemini. Limita a servizi attivi con descrizione presente (servizi senza
 * descrizione mostrano solo nome+durata+prezzo). Limita totale a ~6000 char
 * per non gonfiare il prompt.
 */
export function buildCatalogBlock(services: ServiceForBot[]): string {
  if (services.length === 0) return "";

  const groups = new Map<string, ServiceForBot[]>();
  for (const s of services) {
    if (!groups.has(s.categoria)) groups.set(s.categoria, []);
    groups.get(s.categoria)!.push(s);
  }

  const lines: string[] = [
    "",
    "============================================================",
    "CATALOGO SERVIZI (usa SOLO questo per info su trattamenti)",
    "============================================================",
  ];

  let totalChars = lines.join("\n").length;
  const MAX_CHARS = 6000;

  for (const [cat, list] of groups) {
    if (totalChars >= MAX_CHARS) break;
    lines.push("");
    lines.push(`## ${cat.toUpperCase()}`);
    totalChars += cat.length + 4;
    for (const s of list) {
      const head = `- ${s.nome} — ${s.durata}min — ${s.prezzo.toFixed(0)}€`;
      const desc = s.descrizione ? `\n  ${s.descrizione.trim()}` : "";
      const block = head + desc;
      if (totalChars + block.length > MAX_CHARS) {
        lines.push("- (...altri servizi disponibili, chiedi a Laura per dettagli)");
        break;
      }
      lines.push(block);
      totalChars += block.length + 1;
    }
  }

  return lines.join("\n");
}
