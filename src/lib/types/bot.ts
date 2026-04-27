/**
 * Tipo condiviso fra `src/lib/actions/services.ts` (server action getter
 * `getServicesForBot`) e `src/lib/bot/catalog-context.ts` (helper sincrono
 * che costruisce il blocco di catalogo da iniettare nel systemInstruction
 * di Gemini).
 *
 * Vive in un file NON `"use server"` perché i moduli con `"use server"`
 * possono esportare solo async function — non `type`/`interface`.
 */
export type ServiceForBot = {
  nome: string;
  categoria: string;
  durata: number; // minuti
  prezzo: number; // €
  descrizione: string | null;
};
