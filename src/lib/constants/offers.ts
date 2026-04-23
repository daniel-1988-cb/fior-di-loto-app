// Plain constants module (no "use server").

export const VALID_TIPI_SCONTO = ["percentuale", "importo"] as const;
export type TipoSconto = (typeof VALID_TIPI_SCONTO)[number];
