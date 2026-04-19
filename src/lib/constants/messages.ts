// Plain constants module (no "use server") — safe to import from client and server.

export const VALID_CHANNELS = ["whatsapp", "email", "sms", "push"] as const;
export type Canale = (typeof VALID_CHANNELS)[number];
