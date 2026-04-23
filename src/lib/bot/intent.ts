export type BotIntent = "escalate" | "booking_request" | "opt_out" | "generic";

// ORDINE IMPORTANTE: i pattern più specifici vanno PRIMA di quelli generici.
// `booking_request` deve matchare solo EXPLICIT richieste di NUOVA prenotazione,
// NON domande su appuntamenti esistenti ("quando ho l'appuntamento?", "mio
// prossimo appt", ecc — quelle vanno in `generic` e Gemini risponde con i
// dati del cliente dal contesto iniettato).
const PATTERNS: Array<{ intent: BotIntent; re: RegExp }> = [
  {
    intent: "opt_out",
    re: /(?:\b|^)(stop|non scriver(?:mi)? pi[uù]|cancella(?:mi)?|basta)(?:\b|$|\s)/i,
  },
  {
    intent: "escalate",
    re: /\b(parlare (con|direttamente con) )?laura\b/i,
  },
  {
    // Esplicito "voglio/vorrei/posso prenotare/fissare ..." oppure verbi
    // di prenotazione ("prenotarmi", "prenotazione nuova", ecc). NON matcha
    // "quando è/ho il mio appuntamento" perché non c'è verbo di richiesta.
    intent: "booking_request",
    re: /\b(prenotarmi|fissarmi|prenotami|fissami|prenotazione\s+(nuova|per)|(voglio|vorrei|posso|mi\s+serve|avrei\s+bisogno\s+di|vorrei\s+avere|possiamo|potremmo)\s+(\w+\s+){0,3}(prenotar|fissar|appuntament|seduta|consulenza)|prenota(re|rmi|tevi|ci)?\s+(un|una|il|la|del|delle|della)\s+|fissa(re|tevi|ci)\s+(un|una|il|la))/i,
  },
];

export function detectIntent(text: string): BotIntent {
  for (const p of PATTERNS) {
    if (p.re.test(text)) return p.intent;
  }
  return "generic";
}
