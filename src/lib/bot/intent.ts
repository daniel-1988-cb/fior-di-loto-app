export type BotIntent = "escalate" | "booking_request" | "opt_out" | "generic";

const PATTERNS: Array<{ intent: BotIntent; re: RegExp }> = [
  { intent: "opt_out", re: /(?:\b|^)(stop|non scriver(?:mi)? pi[uù]|cancella(?:mi)?|basta)(?:\b|$|\s)/i },
  { intent: "escalate", re: /\b(parlare (con|direttamente con) )?laura\b/i },
  { intent: "booking_request", re: /\b(prenota(re|zione)?|fissare|appuntamento|call|chiamata|video[- ]?call)\b/i },
];

export function detectIntent(text: string): BotIntent {
  for (const p of PATTERNS) {
    if (p.re.test(text)) return p.intent;
  }
  return "generic";
}
