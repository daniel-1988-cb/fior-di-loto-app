"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, sanitizeString, truncate } from "@/lib/security/validate";

const VALID_PIATTAFORME = ["instagram", "facebook", "tiktok"] as const;

function isValidPiattaforma(p: string): boolean {
  return (VALID_PIATTAFORME as readonly string[]).includes(p);
}

export type Competitor = {
  id: string;
  nome: string;
  handle: string;
  piattaforma: string;
  follower: number;
  post_totali: number;
  freq_settimanale: number;
  engagement_rate: number;
  ultimo_aggiornamento: string | null;
  note: string | null;
  url: string | null;
  created_at: string;
};

export type CompetitorUpdate = {
  id: string;
  competitor_id: string;
  follower: number | null;
  post_totali: number | null;
  freq_settimanale: number | null;
  engagement_rate: number | null;
  data_rilevazione: string;
  note: string | null;
  created_at: string;
};

export async function getCompetitors(): Promise<Competitor[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("social_competitors")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as Competitor[];
}

export async function getCompetitorUpdates(competitorId: string): Promise<CompetitorUpdate[]> {
  if (!isValidUUID(competitorId)) throw new Error("ID non valido");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("competitor_updates")
    .select("*")
    .eq("competitor_id", competitorId)
    .order("data_rilevazione", { ascending: true });

  if (error) throw error;
  return (data || []) as CompetitorUpdate[];
}

export async function createCompetitor(data: {
  nome: string;
  handle: string;
  piattaforma: string;
  url?: string;
  note?: string;
}) {
  if (!data.nome || data.nome.trim().length === 0) throw new Error("Nome obbligatorio");
  if (!data.handle || data.handle.trim().length === 0) throw new Error("Handle obbligatorio");
  if (!isValidPiattaforma(data.piattaforma)) throw new Error("Piattaforma non valida");

  const nome = truncate(sanitizeString(data.nome), 200);
  const handle = truncate(sanitizeString(data.handle.replace(/^@/, "")), 100);
  const url = data.url ? truncate(sanitizeString(data.url), 500) : null;
  const note = data.note ? truncate(sanitizeString(data.note), 1000) : null;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("social_competitors")
    .insert({ nome, handle, piattaforma: data.piattaforma, url, note })
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function updateCompetitor(
  id: string,
  data: {
    nome?: string;
    handle?: string;
    piattaforma?: string;
    follower?: number;
    post_totali?: number;
    freq_settimanale?: number;
    engagement_rate?: number;
    url?: string;
    note?: string;
  }
) {
  if (!isValidUUID(id)) throw new Error("ID non valido");
  if (data.piattaforma && !isValidPiattaforma(data.piattaforma)) throw new Error("Piattaforma non valida");

  const patch: Record<string, unknown> = {};
  if (data.nome !== undefined) patch.nome = truncate(sanitizeString(data.nome), 200);
  if (data.handle !== undefined) patch.handle = truncate(sanitizeString(data.handle.replace(/^@/, "")), 100);
  if (data.piattaforma !== undefined) patch.piattaforma = data.piattaforma;
  if (data.follower !== undefined) patch.follower = Math.max(0, Math.floor(Number(data.follower)));
  if (data.post_totali !== undefined) patch.post_totali = Math.max(0, Math.floor(Number(data.post_totali)));
  if (data.freq_settimanale !== undefined) patch.freq_settimanale = Math.max(0, Number(data.freq_settimanale));
  if (data.engagement_rate !== undefined) patch.engagement_rate = Math.max(0, Number(data.engagement_rate));
  if (data.url !== undefined) patch.url = data.url ? truncate(sanitizeString(data.url), 500) : null;
  if (data.note !== undefined) patch.note = data.note ? truncate(sanitizeString(data.note), 1000) : null;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("social_competitors")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function deleteCompetitor(id: string) {
  if (!isValidUUID(id)) throw new Error("ID non valido");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("social_competitors")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function addCompetitorUpdate(
  competitorId: string,
  data: {
    follower?: number;
    post_totali?: number;
    freq_settimanale?: number;
    engagement_rate?: number;
    note?: string;
  }
) {
  if (!isValidUUID(competitorId)) throw new Error("ID non valido");

  const supabase = createAdminClient();

  // Insert update record
  const { error: updateError } = await supabase
    .from("competitor_updates")
    .insert({
      competitor_id: competitorId,
      follower: data.follower !== undefined ? Math.max(0, Math.floor(Number(data.follower))) : null,
      post_totali: data.post_totali !== undefined ? Math.max(0, Math.floor(Number(data.post_totali))) : null,
      freq_settimanale: data.freq_settimanale !== undefined ? Math.max(0, Number(data.freq_settimanale)) : null,
      engagement_rate: data.engagement_rate !== undefined ? Math.max(0, Number(data.engagement_rate)) : null,
      note: data.note ? truncate(sanitizeString(data.note), 1000) : null,
      data_rilevazione: new Date().toISOString().split("T")[0],
    });

  if (updateError) throw updateError;

  // Update competitor's current metrics
  const metricsPatch: Record<string, unknown> = { ultimo_aggiornamento: new Date().toISOString().split("T")[0] };
  if (data.follower !== undefined) metricsPatch.follower = Math.max(0, Math.floor(Number(data.follower)));
  if (data.post_totali !== undefined) metricsPatch.post_totali = Math.max(0, Math.floor(Number(data.post_totali)));
  if (data.freq_settimanale !== undefined) metricsPatch.freq_settimanale = Math.max(0, Number(data.freq_settimanale));
  if (data.engagement_rate !== undefined) metricsPatch.engagement_rate = Math.max(0, Number(data.engagement_rate));

  const { error: patchError } = await supabase
    .from("social_competitors")
    .update(metricsPatch)
    .eq("id", competitorId);

  if (patchError) throw patchError;
}
