// Plain constants module (no "use server") — safe to import from client.

export const VALID_TRIGGERS = [
  "inattivita_giorni",
  "nuovo_cliente",
  "compleanno",
  "post_visita",
] as const;
export type TriggerTipo = (typeof VALID_TRIGGERS)[number];

export type TriggerConfig = {
  giorni?: number;
};
