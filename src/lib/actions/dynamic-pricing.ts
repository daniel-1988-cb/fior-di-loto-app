"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, sanitizeString, truncate, isValidDate } from "@/lib/security/validate";
import {
  VALID_ADJUST_KINDS,
  VALID_ADJUST_TYPES,
  type AdjustKind,
  type AdjustType,
  type PricingRule,
  type PricingRuleInput,
} from "@/lib/types/pricing";

// ============================================
// HELPERS
// ============================================

const MAX_NOME = 120;
const MAX_DESCR = 2000;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

type PricingRuleRow = {
  id: string;
  nome: string;
  descrizione: string | null;
  adjust_type: string;
  adjust_kind: string;
  adjust_value: number | string;
  giorni_settimana: unknown;
  ora_inizio: string | null;
  ora_fine: string | null;
  servizi_target: unknown;
  data_inizio: string | null;
  data_fine: string | null;
  priorita: number;
  attivo: boolean;
  created_at: string;
  updated_at: string;
};

function isValidAdjustType(t: string): t is AdjustType {
  return (VALID_ADJUST_TYPES as readonly string[]).includes(t);
}

function isValidAdjustKind(k: string): k is AdjustKind {
  return (VALID_ADJUST_KINDS as readonly string[]).includes(k);
}

function normalizeHHMM(value: string): string {
  // Accetta anche HH:MM:SS dal Postgres TIME (lo riduce a HH:MM)
  const trimmed = value.trim();
  if (HHMM_RE.test(trimmed)) return trimmed;
  const m = trimmed.match(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/);
  if (m) return trimmed.slice(0, 5);
  return trimmed;
}

function sanitizeGiorni(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  for (const raw of value) {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isInteger(n) && n >= 0 && n <= 6) seen.add(n);
  }
  return Array.from(seen).sort((a, b) => a - b);
}

function sanitizeServizi(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw === "string" && isValidUUID(raw)) out.push(raw);
    if (out.length >= 200) break;
  }
  return out;
}

function rowToRule(row: PricingRuleRow): PricingRule {
  const adjustType: AdjustType = isValidAdjustType(row.adjust_type)
    ? row.adjust_type
    : "sconto";
  const adjustKind: AdjustKind = isValidAdjustKind(row.adjust_kind)
    ? row.adjust_kind
    : "percentuale";

  return {
    id: row.id,
    nome: row.nome,
    descrizione: row.descrizione,
    adjustType,
    adjustKind,
    adjustValue:
      typeof row.adjust_value === "string" ? Number(row.adjust_value) : row.adjust_value,
    giorniSettimana: sanitizeGiorni(row.giorni_settimana),
    oraInizio: row.ora_inizio ? normalizeHHMM(row.ora_inizio) : null,
    oraFine: row.ora_fine ? normalizeHHMM(row.ora_fine) : null,
    serviziTarget: sanitizeServizi(row.servizi_target),
    dataInizio: row.data_inizio,
    dataFine: row.data_fine,
    priorita: row.priorita,
    attivo: row.attivo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateInput(data: PricingRuleInput, partial: boolean): {
  patch: Record<string, unknown>;
  error?: string;
} {
  const patch: Record<string, unknown> = {};

  if (!partial || data.nome !== undefined) {
    if (!data.nome || typeof data.nome !== "string" || data.nome.trim().length === 0) {
      return { patch, error: "Nome obbligatorio" };
    }
    patch.nome = truncate(sanitizeString(data.nome), MAX_NOME);
  }

  if (data.descrizione !== undefined) {
    patch.descrizione = data.descrizione
      ? truncate(sanitizeString(data.descrizione), MAX_DESCR)
      : null;
  }

  if (!partial || data.adjustType !== undefined) {
    if (!data.adjustType || !isValidAdjustType(data.adjustType)) {
      return { patch, error: "Tipo regola non valido" };
    }
    patch.adjust_type = data.adjustType;
  }

  if (!partial || data.adjustKind !== undefined) {
    if (!data.adjustKind || !isValidAdjustKind(data.adjustKind)) {
      return { patch, error: "Modalita regola non valida" };
    }
    patch.adjust_kind = data.adjustKind;
  }

  if (!partial || data.adjustValue !== undefined) {
    if (typeof data.adjustValue !== "number" || !Number.isFinite(data.adjustValue) || data.adjustValue < 0) {
      return { patch, error: "Valore non valido" };
    }
    const kind = (patch.adjust_kind as string | undefined) ?? data.adjustKind;
    if (kind === "percentuale" && data.adjustValue > 100) {
      return { patch, error: "Percentuale > 100" };
    }
    patch.adjust_value = data.adjustValue;
  }

  if (data.giorniSettimana !== undefined) {
    patch.giorni_settimana = sanitizeGiorni(data.giorniSettimana);
  }

  if (data.oraInizio !== undefined) {
    if (data.oraInizio === null || data.oraInizio === "") {
      patch.ora_inizio = null;
    } else if (typeof data.oraInizio === "string" && HHMM_RE.test(data.oraInizio)) {
      patch.ora_inizio = data.oraInizio;
    } else {
      return { patch, error: "Ora inizio non valida (formato HH:MM)" };
    }
  }

  if (data.oraFine !== undefined) {
    if (data.oraFine === null || data.oraFine === "") {
      patch.ora_fine = null;
    } else if (typeof data.oraFine === "string" && HHMM_RE.test(data.oraFine)) {
      patch.ora_fine = data.oraFine;
    } else {
      return { patch, error: "Ora fine non valida (formato HH:MM)" };
    }
  }

  if (data.serviziTarget !== undefined) {
    patch.servizi_target = sanitizeServizi(data.serviziTarget);
  }

  if (data.dataInizio !== undefined) {
    if (data.dataInizio === null || data.dataInizio === "") {
      patch.data_inizio = null;
    } else if (typeof data.dataInizio === "string" && isValidDate(data.dataInizio)) {
      patch.data_inizio = data.dataInizio;
    } else {
      return { patch, error: "Data inizio non valida" };
    }
  }

  if (data.dataFine !== undefined) {
    if (data.dataFine === null || data.dataFine === "") {
      patch.data_fine = null;
    } else if (typeof data.dataFine === "string" && isValidDate(data.dataFine)) {
      patch.data_fine = data.dataFine;
    } else {
      return { patch, error: "Data fine non valida" };
    }
  }

  if (
    typeof patch.data_inizio === "string" &&
    typeof patch.data_fine === "string" &&
    new Date(patch.data_inizio as string) > new Date(patch.data_fine as string)
  ) {
    return { patch, error: "Data inizio dopo data fine" };
  }

  if (data.priorita !== undefined) {
    if (!Number.isInteger(data.priorita) || data.priorita < 0 || data.priorita > 10000) {
      return { patch, error: "Priorita non valida" };
    }
    patch.priorita = data.priorita;
  }

  if (data.attivo !== undefined) {
    patch.attivo = !!data.attivo;
  }

  return { patch };
}

// ============================================
// READ
// ============================================

export async function getPricingRules(activeOnly = false): Promise<PricingRule[]> {
  const supabase = createAdminClient();
  let q = supabase
    .from("dynamic_pricing_rules")
    .select("*")
    .order("attivo", { ascending: false })
    .order("priorita", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(500);
  if (activeOnly) q = q.eq("attivo", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => rowToRule(r as PricingRuleRow));
}

/**
 * Restituisce solo le regole attive, ordinate dalla "più importante" alla
 * "meno importante" (priorita DESC, poi updated_at DESC). Pensata per essere
 * passata direttamente ad `applyRules` lato carrello/agenda.
 *
 * NB: a differenza di `getPricingRules(true)` qui l'ordinamento è inverso
 * sulla priorità (winner first), che è l'ordine atteso dal motore di pricing.
 */
export async function getActivePricingRules(): Promise<PricingRule[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dynamic_pricing_rules")
    .select("*")
    .eq("attivo", true)
    .order("priorita", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((r) => rowToRule(r as PricingRuleRow));
}

export async function getPricingRule(id: string): Promise<PricingRule | null> {
  if (!isValidUUID(id)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dynamic_pricing_rules")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRule(data as PricingRuleRow) : null;
}

// ============================================
// WRITE
// ============================================

export async function createPricingRule(data: PricingRuleInput): Promise<PricingRule> {
  const { patch, error: vErr } = validateInput(data, false);
  if (vErr) throw new Error(vErr);

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("dynamic_pricing_rules")
    .insert(patch)
    .select()
    .single();
  if (error) throw error;
  return rowToRule(row as PricingRuleRow);
}

export async function updatePricingRule(
  id: string,
  data: PricingRuleInput
): Promise<PricingRule> {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  const { patch, error: vErr } = validateInput(data, true);
  if (vErr) throw new Error(vErr);
  if (Object.keys(patch).length === 0) {
    const cur = await getPricingRule(id);
    if (!cur) throw new Error("Regola non trovata");
    return cur;
  }
  patch.updated_at = new Date().toISOString();

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("dynamic_pricing_rules")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToRule(row as PricingRuleRow);
}

export async function deletePricingRule(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidUUID(id)) return { ok: false, error: "ID non valido" };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("dynamic_pricing_rules")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function togglePricingRuleActive(
  id: string,
  attivo: boolean
): Promise<{ ok: boolean }> {
  if (!isValidUUID(id)) return { ok: false };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("dynamic_pricing_rules")
    .update({ attivo: !!attivo, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { ok: !error };
}
