/**
 * Applicazione delle regole di pricing dinamico al prezzo di un servizio.
 *
 * Modulo "puro" lato logica: nessuna chiamata DB, nessuna dipendenza React,
 * nessuna direttiva "use server". Riceve in input le regole già caricate
 * (vedi `getActivePricingRules` in `@/lib/actions/dynamic-pricing`) e il
 * contesto (datetime + serviceId), e produce l'aggiustamento.
 *
 * Convenzioni:
 * - `delta` è positivo per gli sconti (cliente paga meno) e negativo per le
 *   maggiorazioni (cliente paga di più). Esempio: prezzo originale 100€,
 *   sconto 10€ → adjustedPrice 90€, delta +10€.
 * - Se nessuna regola si applica → `applied = null` e `adjustedPrice = originalPrice`.
 * - Se più regole si applicano: vince quella con `priorita` più alta. A parità
 *   di priorità, vince quella con `updatedAt` più recente.
 * - Il prezzo finale è clampato a 0 (mai negativo).
 */

import type { PricingRule } from "@/lib/types/pricing";

export type PricingApplyContext = {
  /** Datetime ISO o oggetto Date dell'evento (per giorno settimana + ora). */
  when: Date;
  /** UUID del servizio. null per item che non sono servizi (la maggior parte
   * delle regole con `serviziTarget=[]` matchano comunque tutti, ma con
   * serviceId null non è "un servizio" — vedi ruleMatches). */
  serviceId: string | null;
};

export type PricingResult = {
  originalPrice: number;
  adjustedPrice: number;
  /** La regola che ha vinto, null se nessuna. */
  applied: PricingRule | null;
  /** Differenza tra prezzo originale e prezzo aggiustato.
   * Positivo = il cliente paga meno (sconto).
   * Negativo = il cliente paga più (maggiorazione). */
  delta: number;
};

/** Converte "HH:MM" o "HH:MM:SS" in minuti dall'inizio del giorno. null se invalido. */
function hhmmToMinutes(value: string | null): number | null {
  if (!value) return null;
  const m = value.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Estrae minuti dall'inizio del giorno per un Date (locale). */
function dateToMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** YYYY-MM-DD in fuso locale. */
function dateToISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Determina se una regola si applica al contesto dato.
 *
 * - `attivo` deve essere true.
 * - `giorniSettimana`: array vuoto → matcha tutti i giorni; altrimenti
 *    deve contenere `when.getDay()` (0=domenica … 6=sabato).
 * - `oraInizio`/`oraFine`: NULL → tutto il giorno; altrimenti l'ora di
 *    `when` deve essere in `[oraInizio, oraFine)` (start incluso, end escluso).
 *    Se solo una delle due è impostata, l'altra si comporta come "estremo aperto".
 * - `dataInizio`/`dataFine`: NULL → sempre attiva; altrimenti `when` (in formato
 *    YYYY-MM-DD locale) deve essere in `[dataInizio, dataFine]` (entrambi inclusi).
 * - `serviziTarget`: array vuoto → tutti i servizi; altrimenti `serviceId`
 *    deve essere non-null e contenuto nell'array.
 */
export function ruleMatches(rule: PricingRule, ctx: PricingApplyContext): boolean {
  if (!rule.attivo) return false;

  // Giorno settimana
  if (rule.giorniSettimana.length > 0) {
    const dow = ctx.when.getDay();
    if (!rule.giorniSettimana.includes(dow)) return false;
  }

  // Ora del giorno
  const startMin = hhmmToMinutes(rule.oraInizio);
  const endMin = hhmmToMinutes(rule.oraFine);
  if (startMin !== null || endMin !== null) {
    const cur = dateToMinutes(ctx.when);
    if (startMin !== null && cur < startMin) return false;
    if (endMin !== null && cur >= endMin) return false;
  }

  // Range date
  if (rule.dataInizio || rule.dataFine) {
    const today = dateToISODate(ctx.when);
    if (rule.dataInizio && today < rule.dataInizio) return false;
    if (rule.dataFine && today > rule.dataFine) return false;
  }

  // Servizi target
  if (rule.serviziTarget.length > 0) {
    if (!ctx.serviceId) return false;
    if (!rule.serviziTarget.includes(ctx.serviceId)) return false;
  }

  return true;
}

/** Confronto regole per priorità: piu alto vince; a parità, updatedAt piu recente. */
function compareRules(a: PricingRule, b: PricingRule): number {
  if (a.priorita !== b.priorita) return b.priorita - a.priorita;
  // updatedAt è una stringa ISO, confronto lessicografico OK
  if (a.updatedAt < b.updatedAt) return 1;
  if (a.updatedAt > b.updatedAt) return -1;
  return 0;
}

/** Calcola l'aggiustamento prezzo per una singola regola. Restituisce delta
 * (positivo = sconto, negativo = maggiorazione), già clampato in modo che
 * `unitPrice - delta` non scenda sotto 0. */
function computeDelta(unitPrice: number, rule: PricingRule): number {
  let raw: number;
  if (rule.adjustKind === "percentuale") {
    raw = (unitPrice * rule.adjustValue) / 100;
  } else {
    raw = rule.adjustValue;
  }
  const sign = rule.adjustType === "sconto" ? 1 : -1;
  let delta = raw * sign;
  // Clamp: se sconto > unitPrice, prezzo finale = 0 (delta = unitPrice).
  if (delta > unitPrice) delta = unitPrice;
  return delta;
}

/**
 * Applica al massimo UNA regola (priority winner) tra quelle matchanti.
 *
 * @param unitPrice prezzo originale
 * @param rules    elenco regole candidate (non serve siano tutte attive: il match filtra)
 * @param ctx      contesto (datetime + serviceId)
 */
export function applyRules(
  unitPrice: number,
  rules: PricingRule[],
  ctx: PricingApplyContext,
): PricingResult {
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return {
      originalPrice: unitPrice,
      adjustedPrice: unitPrice,
      applied: null,
      delta: 0,
    };
  }

  const matching = rules.filter((r) => ruleMatches(r, ctx));
  if (matching.length === 0) {
    return {
      originalPrice: unitPrice,
      adjustedPrice: unitPrice,
      applied: null,
      delta: 0,
    };
  }

  matching.sort(compareRules);
  const winner = matching[0];
  const delta = computeDelta(unitPrice, winner);
  const adjusted = Math.max(0, unitPrice - delta);

  return {
    originalPrice: unitPrice,
    adjustedPrice: adjusted,
    applied: winner,
    delta,
  };
}
