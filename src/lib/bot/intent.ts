export type BotIntent =
  | "escalate"
  | "booking_request"
  | "reschedule_request"
  | "cancel_request"
  | "opt_out"
  | "generic";

// ORDINE IMPORTANTE: i pattern più specifici vanno PRIMA di quelli generici.
//
// Priorità (dall'alto al basso):
//   1. opt_out          — "stop", "non scrivermi più" — termina la conversazione
//   2. escalate         — "voglio parlare con Laura" — fa subentrare l'umano
//   3. cancel_request   — annullamenti / disdette — devono battere reschedule e booking
//                         perché "voglio cancellare l'appuntamento" altrimenti potrebbe
//                         agganciare verbi tipo "cambiare appuntamento" via reschedule.
//   4. reschedule_request — spostare/anticipare/posticipare/cambiare data/ora.
//                          Va PRIMA di booking_request, altrimenti "voglio spostare
//                          l'appuntamento" verrebbe catturato come booking nuovo.
//   5. booking_request  — solo richieste di NUOVA prenotazione (verbi prenotare/fissare).
//
// Tutto il resto cade in `generic` e viene gestito da Gemini.
//
// CRITICO: per gli intent `reschedule_request` e `cancel_request` il bot NON deve
// MAI rispondere via Gemini libero — c'è hallucination guard a valle nel webhook.
// Il bot risponde solo con testo hardcoded e parcheggia la richiesta in coda
// review per Laura.
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
    // Cancellazione/disdetta di un appuntamento esistente.
    // Match: "voglio cancellare l'appuntamento", "annullare la seduta",
    // "disdire", "non vengo più", "non posso venire", "salto l'appuntamento".
    // Esplicitamente NON cattura il bare "stop" / "cancella" senza contesto
    // (quelli sono già in opt_out, che ha priorità).
    intent: "cancel_request",
    re: /\b(?:vorrei|voglio|posso|devo|posso\s+per\s+favore)?\s*(?:annullare|disdire|cancellare|elimin(?:are|ami))\s+(?:l['’\s]*\s*|il\s+|la\s+|mio\s+|mia\s+)?(?:appuntament|seduta|consulenza|prenotazion|incontr|trattament)|\bnon\s+(?:vengo|posso\s+veni(?:re|rci|rci)|verr[oò])\b|\bsalto\s+(?:l['’\s]*|il\s+|la\s+)?(?:appuntament|seduta|consulenza)|\bdevo\s+(?:annullare|disdire|cancellare)/i,
  },
  {
    // Spostamento / cambio orario di un appuntamento esistente.
    // Match: "spostare/posticipare/anticipare/rimandare l'appuntamento",
    //        "spostarlo/posticiparlo/anticiparlo",
    //        "spostami il mio appuntamento", "lo possiamo spostare?",
    //        "cambiare data/ora/giorno", "cambiare l'appuntamento",
    //        "non posso più alle X mi farebbe comodo Y".
    intent: "reschedule_request",
    re: /\b(?:spost(?:are|arlo|arla|arli|ami|ate|atelo|atela|atemi|iamo|i)|posticip(?:are|arlo|arla|ami|iamo|atelo|i)|anticip(?:are|arlo|arla|ami|iamo|atelo|i)|riprogramm(?:are|ami|iamo|i)|rimand(?:are|arlo|arla|are\s+a)|cambia(?:re|mi|telo|tela)\s+(?:(?:la|il|lo|l['’])\s*)?(?:data|ora|orario|giorno|appuntament|seduta))\b|\b(?:lo|la|li)\s+(?:possiamo|posso|si\s+pu[oò]|si\s+puo)\s+(?:spost|posticip|anticip|cambia|rimand|riprogramm)/i,
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
