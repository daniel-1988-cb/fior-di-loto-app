// Plain constants module (no "use server").

export const VALID_STATI_PO = [
  "in_attesa",
  "in_transito",
  "ricevuto",
  "cancellato",
] as const;
export type PoStato = (typeof VALID_STATI_PO)[number];
