"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  isValidUUID,
  sanitizeString,
  truncate,
  isValidSegmento,
  isValidDate,
} from "@/lib/security/validate";

// ============================================
// TYPES
// ============================================

export const VALID_TIPI_SCONTO = ["percentuale", "importo"] as const;
export type TipoSconto = (typeof VALID_TIPI_SCONTO)[number];

export type Offer = {
  id: string;
  codice: string;
  descrizione: string | null;
  tipoSconto: TipoSconto;
  valoreSconto: number;
  validitaDa: string | null;
  validitaA: string | null;
  maxUsi: number | null;
  usiCorrenti: number;
  segmentiApplicabili: string[];
  attivo: boolean;
  createdAt: string;
};

type OfferRow = {
  id: string;
  codice: string;
  descrizione: string | null;
  tipo_sconto: string;
  valore_sconto: number | string;
  validita_da: string | null;
  validita_a: string | null;
  max_usi: number | null;
  usi_correnti: number;
  segmenti_applicabili: unknown;
  attivo: boolean;
  created_at: string;
};

function rowToOffer(row: OfferRow): Offer {
  const segs = Array.isArray(row.segmenti_applicabili)
    ? (row.segmenti_applicabili as string[]).filter((s) => typeof s === "string")
    : [];
  return {
    id: row.id,
    codice: row.codice,
    descrizione: row.descrizione,
    tipoSconto: (VALID_TIPI_SCONTO as readonly string[]).includes(row.tipo_sconto)
      ? (row.tipo_sconto as TipoSconto)
      : "percentuale",
    valoreSconto:
      typeof row.valore_sconto === "string" ? Number(row.valore_sconto) : row.valore_sconto,
    validitaDa: row.validita_da,
    validitaA: row.validita_a,
    maxUsi: row.max_usi,
    usiCorrenti: row.usi_correnti ?? 0,
    segmentiApplicabili: segs,
    attivo: row.attivo,
    createdAt: row.created_at,
  };
}

function isValidTipoSconto(t: string): t is TipoSconto {
  return (VALID_TIPI_SCONTO as readonly string[]).includes(t);
}

const MAX_CODICE = 30;
const MAX_DESCR = 1000;

function sanitizeCodice(codice: string): string {
  // allow A-Z 0-9 - _ only, uppercase
  return truncate(codice.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, ""), MAX_CODICE);
}

function sanitizeSegmenti(segs: unknown): string[] {
  if (!Array.isArray(segs)) return [];
  return (segs as string[])
    .filter((s) => typeof s === "string" && isValidSegmento(s))
    .slice(0, 10);
}

// ============================================
// READ
// ============================================

export async function getOffers(includeInactive = true): Promise<Offer[]> {
  const supabase = createAdminClient();
  let q = supabase
    .from("offers")
    .select("*")
    .order("attivo", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (!includeInactive) q = q.eq("attivo", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => rowToOffer(r as OfferRow));
}

export async function getOffer(id: string): Promise<Offer | null> {
  if (!isValidUUID(id)) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToOffer(data as OfferRow) : null;
}

// ============================================
// WRITE
// ============================================

type OfferInput = {
  codice?: string;
  descrizione?: string | null;
  tipoSconto?: string;
  valoreSconto?: number;
  validitaDa?: string | null;
  validitaA?: string | null;
  maxUsi?: number | null;
  segmentiApplicabili?: string[];
  attivo?: boolean;
};

export async function createOffer(data: OfferInput): Promise<Offer> {
  if (!data.codice || !data.codice.trim()) throw new Error("Codice obbligatorio");
  const codice = sanitizeCodice(data.codice);
  if (codice.length < 3) throw new Error("Codice troppo corto (min 3 char)");
  if (!data.tipoSconto || !isValidTipoSconto(data.tipoSconto))
    throw new Error("Tipo sconto non valido");
  if (typeof data.valoreSconto !== "number" || data.valoreSconto < 0)
    throw new Error("Valore sconto non valido");
  if (data.tipoSconto === "percentuale" && data.valoreSconto > 100)
    throw new Error("Sconto percentuale > 100%");

  if (data.validitaDa && !isValidDate(data.validitaDa))
    throw new Error("Data validità inizio non valida");
  if (data.validitaA && !isValidDate(data.validitaA))
    throw new Error("Data validità fine non valida");
  if (
    data.validitaDa &&
    data.validitaA &&
    new Date(data.validitaDa) > new Date(data.validitaA)
  ) {
    throw new Error("Inizio validità dopo fine");
  }
  if (
    data.maxUsi !== undefined &&
    data.maxUsi !== null &&
    (!Number.isInteger(data.maxUsi) || data.maxUsi <= 0)
  ) {
    throw new Error("Max usi non valido");
  }

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("offers")
    .insert({
      codice,
      descrizione: data.descrizione ? truncate(sanitizeString(data.descrizione), MAX_DESCR) : null,
      tipo_sconto: data.tipoSconto,
      valore_sconto: data.valoreSconto,
      validita_da: data.validitaDa ?? null,
      validita_a: data.validitaA ?? null,
      max_usi: data.maxUsi ?? null,
      segmenti_applicabili: sanitizeSegmenti(data.segmentiApplicabili ?? []),
      attivo: data.attivo ?? true,
    })
    .select()
    .single();
  if (error) {
    if (error.message.includes("duplicate key")) {
      throw new Error("Codice già esistente");
    }
    throw error;
  }
  return rowToOffer(row as OfferRow);
}

export async function updateOffer(id: string, data: OfferInput): Promise<Offer> {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  const patch: Record<string, unknown> = {};

  if (data.codice !== undefined) {
    const codice = sanitizeCodice(data.codice);
    if (codice.length < 3) throw new Error("Codice troppo corto");
    patch.codice = codice;
  }
  if (data.descrizione !== undefined) {
    patch.descrizione = data.descrizione
      ? truncate(sanitizeString(data.descrizione), MAX_DESCR)
      : null;
  }
  if (data.tipoSconto !== undefined) {
    if (!isValidTipoSconto(data.tipoSconto)) throw new Error("Tipo sconto non valido");
    patch.tipo_sconto = data.tipoSconto;
  }
  if (data.valoreSconto !== undefined) {
    if (typeof data.valoreSconto !== "number" || data.valoreSconto < 0)
      throw new Error("Valore sconto non valido");
    patch.valore_sconto = data.valoreSconto;
  }
  if (data.validitaDa !== undefined) {
    if (data.validitaDa && !isValidDate(data.validitaDa))
      throw new Error("Data validità inizio non valida");
    patch.validita_da = data.validitaDa ?? null;
  }
  if (data.validitaA !== undefined) {
    if (data.validitaA && !isValidDate(data.validitaA))
      throw new Error("Data validità fine non valida");
    patch.validita_a = data.validitaA ?? null;
  }
  if (data.maxUsi !== undefined) {
    if (
      data.maxUsi !== null &&
      (!Number.isInteger(data.maxUsi) || data.maxUsi <= 0)
    ) {
      throw new Error("Max usi non valido");
    }
    patch.max_usi = data.maxUsi;
  }
  if (data.segmentiApplicabili !== undefined) {
    patch.segmenti_applicabili = sanitizeSegmenti(data.segmentiApplicabili);
  }
  if (data.attivo !== undefined) patch.attivo = !!data.attivo;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("offers")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.message.includes("duplicate key")) {
      throw new Error("Codice già esistente");
    }
    throw error;
  }
  return rowToOffer(row as OfferRow);
}

export async function deleteOffer(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!isValidUUID(id)) return { ok: false, error: "ID non valido" };
  const supabase = createAdminClient();
  // If any uses recorded, soft-archive; else hard delete.
  const { data: cur } = await supabase
    .from("offers")
    .select("usi_correnti")
    .eq("id", id)
    .maybeSingle();
  if (cur && (cur.usi_correnti ?? 0) > 0) {
    const { error } = await supabase.from("offers").update({ attivo: false }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: "archived" };
  }
  const { error } = await supabase.from("offers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleOfferAttivo(
  id: string,
  attivo: boolean
): Promise<{ ok: boolean }> {
  if (!isValidUUID(id)) return { ok: false };
  const supabase = createAdminClient();
  const { error } = await supabase.from("offers").update({ attivo }).eq("id", id);
  return { ok: !error };
}
