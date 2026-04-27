// Sync helpers per slot/datetime — separati da `slot-availability.ts` perché
// quel file ha `"use server"` (solo async exports consentiti). Importati anche
// dal webhook e dai test.

/**
 * Etichetta human-friendly tipo "domani 14:30" o "lun 28 ott 10:00".
 * Usata per suggerire alternative al cliente nel reply WA.
 *
 * NB: usa getUTC* perché tutti gli ISO che il bot maneggia sono in UTC e
 * il datetime parser converte già da Europe/Rome → UTC a monte. Per il
 * confronto "oggi/domani" si confronta `d.getUTCDate()` con la data di
 * adesso lato server (già in UTC perché Vercel è UTC).
 */
export function humanLabelForSlot(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setUTCHours(0, 0, 0, 0);
  const dayDiff = Math.round(
    (target.getTime() - todayUTC.getTime()) / (24 * 60 * 60 * 1000),
  );

  const HH = String(d.getUTCHours()).padStart(2, "0");
  const MM = String(d.getUTCMinutes()).padStart(2, "0");
  const time = `${HH}:${MM}`;

  if (dayDiff === 0) return `oggi ${time}`;
  if (dayDiff === 1) return `domani ${time}`;
  if (dayDiff === 2) return `dopodomani ${time}`;
  const dayNames = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
  const monthNames = [
    "gen", "feb", "mar", "apr", "mag", "giu",
    "lug", "ago", "set", "ott", "nov", "dic",
  ];
  const dayName = dayNames[d.getUTCDay()];
  const dayNum = d.getUTCDate();
  const month = monthNames[d.getUTCMonth()];
  return `${dayName} ${dayNum} ${month} ${time}`;
}

/**
 * Estrae un datetime ISO da un messaggio italiano colloquiale.
 *
 * Pattern supportati:
 *   - "alle HH:MM" / "alle HH" / "alle HH e MM" → ora
 *   - "oggi" / "domani" / "dopodomani" → giorno
 *   - "lunedì/martedì/.../domenica" → prossima ricorrenza di quel giorno
 *   - "il G/M" o "il G/M/AAAA" → data esplicita
 *
 * Combinazioni: "domani alle 10:30", "venerdì alle 9", "il 30/04 alle 17".
 *
 * Se manca l'ora ma c'è il giorno → ritorna null (non vogliamo proporre slot
 * a "00:00 di domani" — meglio chiedere a Laura).
 *
 * `now` parametrizzato per i test. Se assente usa Date.now() in UTC.
 *
 * Output: ISO 8601 string in UTC.
 */
export function parseDateTimeFromText(
  text: string,
  now: Date = new Date(),
): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  // 1) Estrai ORA — variante "alle HH:MM" o "alle HH".
  let hour: number | null = null;
  let minute = 0;
  const timeMatch =
    /\balle\s+(\d{1,2})(?:[:.]?(\d{2}))?(?:\s*e\s*(\d{1,2}))?/.exec(lower) ||
    /\b(\d{1,2})[:.](\d{2})\b/.exec(lower);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m1 = timeMatch[2] ? parseInt(timeMatch[2], 10) : null;
    const m2 = timeMatch[3] ? parseInt(timeMatch[3], 10) : null;
    if (h >= 0 && h <= 23) {
      hour = h;
      minute = m1 ?? m2 ?? 0;
      if (minute < 0 || minute > 59) minute = 0;
    }
  }
  if (hour === null) return null;

  // 2) Estrai GIORNO. Default: oggi (interpretato come "oggi alle X" se h non
  // ancora passata, altrimenti rifiuto — meglio chiedere conferma).
  const target = new Date(now);
  let dayResolved = false;

  // "domani" / "dopodomani" / "oggi" — conta literal " parole" non substring,
  // altrimenti "doman" matcha "domani" ma "tedomani" no — i \b sono ok.
  if (/\bdopodomani\b/.test(lower)) {
    target.setUTCDate(target.getUTCDate() + 2);
    dayResolved = true;
  } else if (/\bdomani\b/.test(lower)) {
    target.setUTCDate(target.getUTCDate() + 1);
    dayResolved = true;
  } else if (/\boggi\b/.test(lower)) {
    dayResolved = true;
  }

  // Giorno della settimana → prossima ricorrenza
  const weekDays: Record<string, number> = {
    domenica: 0, lunedi: 1, "lunedì": 1, martedi: 2, "martedì": 2,
    mercoledi: 3, "mercoledì": 3, giovedi: 4, "giovedì": 4,
    venerdi: 5, "venerdì": 5, sabato: 6,
  };
  if (!dayResolved) {
    for (const [name, dow] of Object.entries(weekDays)) {
      if (new RegExp(`\\b${name}\\b`).test(lower)) {
        const todayDow = target.getUTCDay();
        let diff = dow - todayDow;
        if (diff <= 0) diff += 7;
        target.setUTCDate(target.getUTCDate() + diff);
        dayResolved = true;
        break;
      }
    }
  }

  // "il 30/04" oppure "30/04/2026"
  if (!dayResolved) {
    const dateMatch = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/.exec(
      lower,
    );
    if (dateMatch) {
      const d = parseInt(dateMatch[1], 10);
      const m = parseInt(dateMatch[2], 10);
      const yRaw = dateMatch[3] ? parseInt(dateMatch[3], 10) : target.getUTCFullYear();
      const y = yRaw < 100 ? 2000 + yRaw : yRaw;
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        target.setUTCFullYear(y, m - 1, d);
        dayResolved = true;
      }
    }
  }

  if (!dayResolved) {
    // Senza riferimento esplicito al giorno e senza che l'ora sia nel futuro
    // dello stesso giorno, è troppo ambiguo: torna null e il bot risponderà
    // con il fallback generico ("Laura ti scrive a breve per concordare").
    const candidate = new Date(target);
    candidate.setUTCHours(hour, minute, 0, 0);
    if (candidate.getTime() <= now.getTime()) return null;
    target.setUTCHours(hour, minute, 0, 0);
    return target.toISOString();
  }

  target.setUTCHours(hour, minute, 0, 0);
  // Se per caso l'ora è già passata oggi e il cliente ha detto "oggi alle 8"
  // ma sono le 10, restituiamo comunque la data: Laura potrà respingere.
  return target.toISOString();
}
