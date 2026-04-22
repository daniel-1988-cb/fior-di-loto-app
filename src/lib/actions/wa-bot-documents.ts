"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeCategoria } from "@/lib/bot/categorie";

export type WaBotDoc = {
  id: string;
  titolo: string;
  contenuto: string;
  categoria: string;
  attivo: boolean;
  ordine: number;
  created_at: string;
};

export async function listBotDocuments(): Promise<WaBotDoc[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wa_bot_documents")
    .select("id, titolo, contenuto, categoria, attivo, ordine, created_at")
    .order("categoria", { ascending: true })
    .order("ordine", { ascending: true });
  return (data ?? []) as WaBotDoc[];
}

export async function getActiveBotDocuments(): Promise<WaBotDoc[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wa_bot_documents")
    .select("id, titolo, contenuto, categoria, attivo, ordine, created_at")
    .eq("attivo", true)
    .order("ordine", { ascending: true });
  return (data ?? []) as WaBotDoc[];
}

export async function createBotDocument(
  input: {
    titolo: string;
    contenuto: string;
    categoria?: string;
    attivo?: boolean;
    ordine?: number;
  },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wa_bot_documents")
    .insert({
      titolo: input.titolo,
      contenuto: input.contenuto,
      categoria: normalizeCategoria(input.categoria),
      attivo: input.attivo ?? true,
      ordine: input.ordine ?? 0,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "insert failed" };
  return { ok: true, id: data.id };
}

export async function updateBotDocument(
  id: string,
  patch: {
    titolo?: string;
    contenuto?: string;
    categoria?: string;
    attivo?: boolean;
    ordine?: number;
  },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const nextPatch: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  if (patch.categoria !== undefined) {
    nextPatch.categoria = normalizeCategoria(patch.categoria);
  }
  const { error } = await supabase
    .from("wa_bot_documents")
    .update(nextPatch)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteBotDocument(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("wa_bot_documents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
