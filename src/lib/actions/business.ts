"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/actions/ai-assistant";
import { sanitizeString, truncate } from "@/lib/security/validate";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export type BusinessSettings = {
  id: string;
  nome: string | null;
  indirizzo: string | null;
  citta: string | null;
  cap: string | null;
  provincia: string | null;
  paese: string | null;
  p_iva: string | null;
  codice_fiscale: string | null;
  telefono: string | null;
  email: string | null;
  sito_web: string | null;
  logo_url: string | null;
  currency: string | null;
  timezone: string | null;
  iva_default: number | null;
  metodi_pagamento: string[] | null;
  policy_cancellazione: string | null;
  updated_at: string | null;
};

export type BusinessHour = {
  id: string;
  giorno: number;
  apertura: string | null;
  chiusura: string | null;
  chiuso: boolean;
  pausa_inizio: string | null;
  pausa_fine: string | null;
};

export type BusinessHourInput = {
  giorno: number;
  apertura?: string | null;
  chiusura?: string | null;
  chiuso: boolean;
  pausa_inizio?: string | null;
  pausa_fine?: string | null;
};

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getBusinessSettings(): Promise<BusinessSettings | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("business_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .maybeSingle();
  if (error) throw error;
  return (data as BusinessSettings | null) ?? null;
}

export async function updateBusinessSettings(
  data: Partial<Omit<BusinessSettings, "id" | "updated_at">>
): Promise<BusinessSettings> {
  const admin = await isAdmin();
  if (!admin) throw new Error("Accesso negato");

  const allowed: Record<string, unknown> = {};

  if (data.nome !== undefined) {
    const v = (data.nome ?? "").toString();
    if (!v.trim()) throw new Error("Nome obbligatorio");
    allowed.nome = truncate(sanitizeString(v), 200);
  }
  if (data.indirizzo !== undefined) {
    allowed.indirizzo = data.indirizzo ? truncate(sanitizeString(String(data.indirizzo)), 300) : null;
  }
  if (data.citta !== undefined) {
    allowed.citta = data.citta ? truncate(sanitizeString(String(data.citta)), 120) : null;
  }
  if (data.cap !== undefined) {
    const v = data.cap ? String(data.cap).trim() : null;
    if (v && !/^\d{4,5}$/.test(v)) throw new Error("CAP non valido");
    allowed.cap = v;
  }
  if (data.provincia !== undefined) {
    const v = data.provincia ? String(data.provincia).trim().toUpperCase() : null;
    if (v && !/^[A-Z]{2}$/.test(v)) throw new Error("Provincia non valida (2 lettere)");
    allowed.provincia = v;
  }
  if (data.paese !== undefined) {
    const v = data.paese ? String(data.paese).trim().toUpperCase() : null;
    if (v && !/^[A-Z]{2}$/.test(v)) throw new Error("Paese non valido (2 lettere ISO)");
    allowed.paese = v ?? "IT";
  }
  if (data.p_iva !== undefined) {
    const v = data.p_iva ? String(data.p_iva).replace(/\s/g, "") : null;
    if (v && !/^\d{11}$/.test(v)) throw new Error("Partita IVA non valida (11 cifre)");
    allowed.p_iva = v;
  }
  if (data.codice_fiscale !== undefined) {
    const v = data.codice_fiscale ? String(data.codice_fiscale).trim().toUpperCase() : null;
    if (v && !/^[A-Z0-9]{11,16}$/.test(v)) throw new Error("Codice fiscale non valido");
    allowed.codice_fiscale = v;
  }
  if (data.telefono !== undefined) {
    allowed.telefono = data.telefono ? truncate(String(data.telefono).trim(), 30) : null;
  }
  if (data.email !== undefined) {
    allowed.email = data.email ? truncate(String(data.email).trim().toLowerCase(), 255) : null;
  }
  if (data.sito_web !== undefined) {
    allowed.sito_web = data.sito_web ? truncate(String(data.sito_web).trim(), 255) : null;
  }
  if (data.logo_url !== undefined) {
    allowed.logo_url = data.logo_url ? truncate(String(data.logo_url).trim(), 500) : null;
  }
  if (data.currency !== undefined) {
    const valid = ["EUR", "USD", "GBP", "CHF"];
    const v = (data.currency ?? "EUR").toString().toUpperCase();
    if (!valid.includes(v)) throw new Error("Valuta non valida");
    allowed.currency = v;
  }
  if (data.timezone !== undefined) {
    const valid = ["Europe/Rome", "Europe/London", "Europe/Paris", "Europe/Madrid", "UTC"];
    const v = (data.timezone ?? "Europe/Rome").toString();
    if (!valid.includes(v)) throw new Error("Fuso orario non valido");
    allowed.timezone = v;
  }
  if (data.iva_default !== undefined) {
    const n = Number(data.iva_default);
    if (Number.isNaN(n) || n < 0 || n > 100) throw new Error("IVA non valida");
    allowed.iva_default = n;
  }
  if (data.metodi_pagamento !== undefined) {
    if (!Array.isArray(data.metodi_pagamento)) throw new Error("Metodi pagamento non validi");
    allowed.metodi_pagamento = data.metodi_pagamento
      .map((m) => truncate(sanitizeString(String(m)), 60))
      .filter((m) => m.length > 0)
      .slice(0, 30);
  }
  if (data.policy_cancellazione !== undefined) {
    allowed.policy_cancellazione = data.policy_cancellazione
      ? truncate(sanitizeString(String(data.policy_cancellazione)), 4000)
      : null;
  }

  allowed.updated_at = new Date().toISOString();

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("business_settings")
    .update(allowed)
    .eq("id", SETTINGS_ID)
    .select()
    .single();
  if (error) throw error;
  return row as BusinessSettings;
}

// ─── Hours ───────────────────────────────────────────────────────────────────

export async function getBusinessHours(): Promise<BusinessHour[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("business_hours")
    .select("*")
    .order("giorno", { ascending: true });
  if (error) throw error;
  return (data || []) as BusinessHour[];
}

async function normalizeTime(t?: string | null): Promise<string | null> {
  if (!t) return null;
  const s = String(t).trim();
  if (!s) return null;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(s)) throw new Error(`Orario non valido: ${s}`);
  return s.length === 5 ? `${s}:00` : s;
}

export async function updateBusinessHours(hours: BusinessHourInput[]): Promise<BusinessHour[]> {
  const admin = await isAdmin();
  if (!admin) throw new Error("Accesso negato");
  if (!Array.isArray(hours)) throw new Error("Orari non validi");

  const supabase = createAdminClient();
  const results: BusinessHour[] = [];

  for (const h of hours) {
    if (typeof h.giorno !== "number" || h.giorno < 0 || h.giorno > 6) {
      throw new Error(`Giorno non valido: ${h.giorno}`);
    }
    const chiuso = Boolean(h.chiuso);
    const apertura = chiuso ? null : await normalizeTime(h.apertura);
    const chiusura = chiuso ? null : await normalizeTime(h.chiusura);
    const pausa_inizio = chiuso ? null : await normalizeTime(h.pausa_inizio);
    const pausa_fine = chiuso ? null : await normalizeTime(h.pausa_fine);

    if (!chiuso && (!apertura || !chiusura)) {
      throw new Error("Apertura e chiusura obbligatorie nei giorni aperti");
    }

    const { data: row, error } = await supabase
      .from("business_hours")
      .upsert(
        {
          giorno: h.giorno,
          apertura,
          chiusura,
          chiuso,
          pausa_inizio,
          pausa_fine,
        },
        { onConflict: "giorno" }
      )
      .select()
      .single();
    if (error) throw error;
    results.push(row as BusinessHour);
  }

  return results;
}
