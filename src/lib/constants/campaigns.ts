// Plain constants module (no "use server") — safe to import from client and server.
// Extracted out of actions/campaigns.ts because "use server" files can only
// export async functions (Next 16 strict check).

export const VALID_STATI = [
  "bozza",
  "programmata",
  "in_invio",
  "inviata",
  "errore",
] as const;
export type CampaignStato = (typeof VALID_STATI)[number];
